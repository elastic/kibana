import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
export declare const MINIMUM_INDEX_PRIVILEGE_SET_EDITOR: string[];
export declare const TOTAL_INDEX_PRIVILEGE_SET_EDITOR: string[];
export declare const MINIMUM_INDEX_PRIVILEGE_SET_VIEWER: string[];
export declare const TOTAL_INDEX_PRIVILEGE_SET_VIEWER: string[];
export declare function getGlobalDiagnosis(esClient: ElasticsearchClient, licensing: LicensingPluginStart): Promise<{
    licenseAndFeatures: import("@kbn/licensing-types").PublicLicenseJSON;
    userPrivileges: {
        write: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
        read: import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse;
    };
}>;
