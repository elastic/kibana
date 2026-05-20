import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { BulkDeleteParams, BulkDeleteResult } from '@kbn/slo-schema';
import type { DeleteSLO } from '../../delete_slo';
interface Dependencies {
    scopedClusterClient: IScopedClusterClient;
    rulesClient: RulesClientApi;
    deleteSLO: DeleteSLO;
    logger: Logger;
    abortController: AbortController;
}
export declare function runBulkDelete(params: BulkDeleteParams, dependencies: Dependencies): Promise<BulkDeleteResult[]>;
export {};
