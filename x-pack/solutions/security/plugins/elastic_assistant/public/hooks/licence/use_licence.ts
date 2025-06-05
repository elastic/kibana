import { LicenseService } from "./license_service";

export const licenseService = new LicenseService();

export function useLicense() {
  return licenseService;
}