/// <reference types="vite/client" />
import type { MusixApi } from '@shared/api'

declare global {
  interface Window {
    musix: MusixApi
  }
}
