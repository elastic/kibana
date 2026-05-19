import type { ILicense } from '@kbn/licensing-types';
export interface UMLicenseStatusResponse {
    statusCode: number;
    message: string;
}
export type UMLicenseCheck = (license?: Pick<ILicense, 'isActive' | 'hasAtLeast'>) => UMLicenseStatusResponse;
export declare const licenseCheck: UMLicenseCheck;
