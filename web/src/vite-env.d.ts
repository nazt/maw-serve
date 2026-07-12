/// <reference types="vite/client" />

interface StoaBuildIdentity {
  branch: string;
  commit: string;
  builder: string;
  buildTime: string;
}

declare const __STOA_BUILD__: Readonly<StoaBuildIdentity>;
