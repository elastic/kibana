import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { TransformGenerator } from '.';
import type { SLODefinition } from '../../domain/models';
export declare class KQLCustomTransformGenerator extends TransformGenerator {
    constructor(spaceId: string, dataViewService: DataViewsService, isServerless: boolean);
    getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest>;
    private buildTransformId;
    private buildSource;
    private buildDestination;
    private buildAggregations;
}
