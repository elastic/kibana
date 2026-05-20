import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { GetPreviewDataParams, GetPreviewDataResponse } from '@kbn/slo-schema';
export declare class GetPreviewData {
    private esClient;
    private spaceId;
    private dataViewService;
    constructor(esClient: ElasticsearchClient, spaceId: string, dataViewService: DataViewsService);
    private getDataView;
    private buildRuntimeMappings;
    private addExtraTermsOrMultiTermsAgg;
    private getAPMTransactionDurationPreviewData;
    private getAPMTransactionErrorPreviewData;
    private getHistogramPreviewData;
    private getCustomMetricPreviewData;
    private getTimesliceMetricPreviewData;
    private getCustomKQLPreviewData;
    private getGroupingFilters;
    private getSyntheticsAvailabilityPreviewData;
    execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse>;
}
