import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export interface ResourceInstaller {
    ensureCommonResourcesInstalled(): Promise<void>;
}
export declare class DefaultResourceInstaller implements ResourceInstaller {
    private esClient;
    private logger;
    private isCompositeSloEnabled;
    constructor(esClient: ElasticsearchClient, logger: Logger, isCompositeSloEnabled: boolean);
    ensureCommonResourcesInstalled(): Promise<void>;
    private createOrUpdateComponentTemplate;
    private createOrUpdateIndexTemplate;
    private createIndex;
    private updateCompositeSummaryMapping;
    private createDataStream;
    private execute;
    private fetchComponentTemplateVersion;
    private fetchIndexTemplateVersion;
}
