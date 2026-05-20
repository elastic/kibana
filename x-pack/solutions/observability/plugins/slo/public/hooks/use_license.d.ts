import type { ILicense, LicenseType } from '@kbn/licensing-types';
interface UseLicenseReturnValue {
    getLicense: () => ILicense | null;
    hasAtLeast: (level: LicenseType) => boolean | undefined;
}
export declare const useLicense: () => UseLicenseReturnValue;
export {};
