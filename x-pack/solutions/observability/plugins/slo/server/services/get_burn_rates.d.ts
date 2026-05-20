import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { GetSLOBurnRatesResponse } from '@kbn/slo-schema';
import type { Duration } from '../domain/models';
interface Services {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
}
interface LookbackWindow {
    name: string;
    duration: Duration;
}
interface Params {
    sloId: string;
    spaceId: string;
    instanceId: string;
    remoteName?: string;
    windows: LookbackWindow[];
    services: Services;
}
export declare function getBurnRates({ sloId, spaceId, windows, instanceId, remoteName, services, }: Params): Promise<GetSLOBurnRatesResponse>;
export {};
