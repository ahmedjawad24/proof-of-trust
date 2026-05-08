"use client";

import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
  window.process = window.process || { env: {} } as any;
}
