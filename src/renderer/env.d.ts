/// <reference types="vite/client" />

import type { PersonnelArchiveBridge } from "../shared/ipc-contract"

declare global {
  interface Window {
    readonly personnelArchive: PersonnelArchiveBridge
  }
}
