import type { MappingRuntimeFields, TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import type { TransformSettings } from '../../assets/transform_templates/slo_transform_template';
import type { SLODefinition } from '../../domain/models';
export declare abstract class TransformGenerator {
    protected spaceId: string;
    protected dataViewService: DataViewsService;
    protected isServerless: boolean;
    constructor(spaceId: string, dataViewService: DataViewsService, isServerless?: boolean);
    abstract getTransformParams(slo: SLODefinition): Promise<TransformPutTransformRequest>;
    buildCommonRuntimeMappings(dataView?: DataView): MappingRuntimeFields;
    buildDescription(slo: SLODefinition): string;
    buildCommonGroupBy(slo: SLODefinition, sourceIndexTimestampField?: string | undefined, extraGroupByFields?: {}): {
        '@timestamp': {
            date_histogram: {
                field: string;
                fixed_interval: string;
            };
        };
    };
    getIndicatorDataView(dataViewId?: string): Promise<DataView | undefined>;
    buildSettings(slo: SLODefinition, sourceIndexTimestampField?: string | undefined): TransformSettings;
}
