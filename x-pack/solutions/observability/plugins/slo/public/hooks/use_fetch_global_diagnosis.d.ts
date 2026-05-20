import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import type { PublicLicenseJSON } from '@kbn/licensing-types';
interface SloGlobalDiagnosisResponse {
    licenseAndFeatures: PublicLicenseJSON;
    userPrivileges: {
        write: SecurityHasPrivilegesResponse;
        read: SecurityHasPrivilegesResponse;
    };
}
export interface UseFetchSloGlobalDiagnoseResponse {
    isLoading: boolean;
    data: SloGlobalDiagnosisResponse | undefined;
}
export declare function useFetchSloGlobalDiagnosis(): UseFetchSloGlobalDiagnoseResponse;
export {};
