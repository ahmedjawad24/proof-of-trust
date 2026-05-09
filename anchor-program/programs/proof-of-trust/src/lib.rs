use anchor_lang::prelude::*;

declare_id!("xSmeQLCwoyYbctUNBSqAG4k63sqUxPY3ZMo3X38tz");

#[program]
pub mod proof_of_trust {
    use super::*;

    /// Initialize a new auditor profile for the user
    pub fn initialize_auditor(ctx: Context<InitializeAuditor>) -> Result<()> {
        let auditor = &mut ctx.accounts.auditor_profile;
        auditor.authority = ctx.accounts.user.key();
        auditor.total_audits = 0;
        auditor.trust_score = 100; // Start with 100 base score
        auditor.successful_verifications = 0;
        auditor.failed_verifications = 0;
        auditor.created_at = Clock::get()?.unix_timestamp;
        
        msg!("Auditor Profile Initialized for: {:?}", auditor.authority);
        
        emit!(AuditorCreated {
            auditor: auditor.authority,
            timestamp: auditor.created_at,
        });

        Ok(())
    }

    /// Record a new AI audit on-chain with verdict
    pub fn record_audit(
        ctx: Context<RecordAudit>,
        model_name: String,
        content_hash: [u8; 32],
        verdict: bool, // true = verified, false = hallucination detected
        confidence: u8, // 0-100
    ) -> Result<()> {
        require!(confidence <= 100, CustomError::InvalidConfidence);

        let auditor = &mut ctx.accounts.auditor_profile;
        let audit_record = &mut ctx.accounts.audit_record;
        let model_stats = &mut ctx.accounts.model_stats;

        // Initialize audit record
        audit_record.auditor = auditor.authority;
        audit_record.model_name = model_name.clone();
        audit_record.content_hash = content_hash;
        audit_record.verdict = verdict;
        audit_record.confidence = confidence;
        audit_record.timestamp = Clock::get()?.unix_timestamp;

        // Update auditor stats
        auditor.total_audits += 1;
        if verdict {
            auditor.successful_verifications += 1;
        } else {
            auditor.failed_verifications += 1;
        }

        // Update trust score based on performance
        update_auditor_trust_score(auditor)?;

        // Update model statistics
        model_stats.total_audits += 1;
        if verdict {
            model_stats.verified_count += 1;
        } else {
            model_stats.hallucination_count += 1;
        }
        model_stats.last_audit_timestamp = Clock::get()?.unix_timestamp;

        // Calculate trust rating for this model (0-100)
        if model_stats.total_audits > 0 {
            model_stats.trust_rating = ((model_stats.verified_count as u64 * 100)
                / model_stats.total_audits) as u8;
        }

        emit!(AuditRecorded {
            auditor: auditor.authority,
            model: model_name,
            content_hash: content_hash,
            verdict,
            confidence,
            timestamp: audit_record.timestamp,
        });

        msg!("Audit recorded successfully!");
        Ok(())
    }

    /// Challenge an audit (requires SOL bond)
    pub fn challenge_audit(
        ctx: Context<ChallengeAudit>,
        original_content_hash: [u8; 32],
        challenge_reason: String,
    ) -> Result<()> {
        require!(challenge_reason.len() <= 256, CustomError::ReasonTooLong);

        let challenge = &mut ctx.accounts.challenge;
        challenge.challenger = ctx.accounts.challenger.key();
        challenge.original_content_hash = original_content_hash;
        challenge.challenge_reason = challenge_reason;
        challenge.timestamp = Clock::get()?.unix_timestamp;
        challenge.bond_amount = 100_000_000; // 0.1 SOL minimum bond
        challenge.resolved = false;

        emit!(AuditChallenged {
            challenger: challenge.challenger,
            content_hash: original_content_hash,
            timestamp: challenge.timestamp,
        });

        Ok(())
    }

    /// Resolve a challenge
    pub fn resolve_challenge(
        ctx: Context<ResolveChallenge>,
        challenge_valid: bool,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(!challenge.resolved, CustomError::ChallengeAlreadyResolved);

        let auditor = &mut ctx.accounts.auditor_profile;

        if challenge_valid {
            // Challenge was valid - slash the auditor's trust score
            auditor.trust_score = auditor
                .trust_score
                .saturating_sub(10);
        } else {
            // Challenge was invalid - reward the auditor
            auditor.trust_score = auditor
                .trust_score
                .saturating_add(5);
        }

        challenge.resolved = true;

        emit!(ChallengeResolved {
            challenge_valid,
            auditor: auditor.authority,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Initialize global model statistics
    pub fn initialize_model(
        ctx: Context<InitializeModel>,
        model_name: String,
    ) -> Result<()> {
        let model = &mut ctx.accounts.model_stats;
        model.name = model_name;
        model.total_audits = 0;
        model.verified_count = 0;
        model.hallucination_count = 0;
        model.trust_rating = 0;
        model.created_at = Clock::get()?.unix_timestamp;
        model.last_audit_timestamp = 0;

        msg!("Model initialized: {}", model.name);
        Ok(())
    }
}

// Helper function to recalculate trust score
fn update_auditor_trust_score(auditor: &mut AuditorProfile) -> Result<()> {
    if auditor.total_audits == 0 {
        return Ok(());
    }

    let accuracy = (auditor.successful_verifications as u64 * 100)
        / auditor.total_audits;

    // Base score calculation
    let base_score = 50 + (accuracy / 2); // 50-100 range
    auditor.trust_score = base_score as u64;

    // Bonus for high activity
    if auditor.total_audits > 10 {
        auditor.trust_score += 10;
    }

    Ok(())
}

// Account Structures
#[derive(Accounts)]
pub struct InitializeAuditor<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8, 
        seeds = [b"auditor", user.key().as_ref()],
        bump
    )]
    pub auditor_profile: Account<'info, AuditorProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordAudit<'info> {
    #[account(mut, has_one = authority)]
    pub auditor_profile: Account<'info, AuditorProfile>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 64 + 32 + 1 + 1 + 8,
        seeds = [b"audit", authority.key().as_ref(), &(auditor_profile.total_audits as u64).to_le_bytes()],
        bump
    )]
    pub audit_record: Account<'info, AuditRecord>,
    #[account(
        mut,
        seeds = [b"model", auditor_profile.key().as_ref()],
        bump
    )]
    pub model_stats: Account<'info, ModelStats>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ChallengeAudit<'info> {
    #[account(
        init,
        payer = challenger,
        space = 8 + 32 + 32 + 256 + 8 + 8 + 1,
        seeds = [b"challenge", challenger.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub auditor_profile: Account<'info, AuditorProfile>,
}

#[derive(Accounts)]
pub struct InitializeModel<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 64 + 8 + 8 + 8 + 1 + 8 + 8,
        seeds = [b"model", admin.key().as_ref()],
        bump
    )]
    pub model_stats: Account<'info, ModelStats>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Data Accounts
#[account]
pub struct AuditorProfile {
    pub authority: Pubkey,
    pub trust_score: u64,
    pub total_audits: u64,
    pub successful_verifications: u64,
    pub failed_verifications: u64,
    pub created_at: i64,
}

#[account]
pub struct AuditRecord {
    pub auditor: Pubkey,
    pub model_name: String,
    pub content_hash: [u8; 32],
    pub verdict: bool,
    pub confidence: u8,
    pub timestamp: i64,
}

#[account]
pub struct ModelStats {
    pub name: String,
    pub total_audits: u64,
    pub verified_count: u64,
    pub hallucination_count: u64,
    pub trust_rating: u8,
    pub created_at: i64,
    pub last_audit_timestamp: i64,
}

#[account]
pub struct Challenge {
    pub challenger: Pubkey,
    pub original_content_hash: [u8; 32],
    pub challenge_reason: String,
    pub timestamp: i64,
    pub bond_amount: u64,
    pub resolved: bool,
}

// Events
#[event]
pub struct AuditRecorded {
    pub auditor: Pubkey,
    pub model: String,
    pub content_hash: [u8; 32],
    pub verdict: bool,
    pub confidence: u8,
    pub timestamp: i64,
}

#[event]
pub struct AuditorCreated {
    pub auditor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuditChallenged {
    pub challenger: Pubkey,
    pub content_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct ChallengeResolved {
    pub challenge_valid: bool,
    pub auditor: Pubkey,
    pub timestamp: i64,
}

// Custom Errors
#[error_code]
pub enum CustomError {
    #[msg("Confidence score must be between 0-100")]
    InvalidConfidence,
    #[msg("Challenge reason is too long")]
    ReasonTooLong,
    #[msg("Challenge already resolved")]
    ChallengeAlreadyResolved,
}
