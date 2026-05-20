import type { TransformDestination, TransformPivot, TransformPutTransformRequest, TransformSource, TransformTimeSync } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../domain/models';
export interface TransformSettings {
    frequency: TransformPutTransformRequest['frequency'];
    sync_field: TransformTimeSync['field'];
    sync_delay: TransformTimeSync['delay'];
}
export declare const getSLOTransformTemplate: (transformId: string, description: string, source: TransformSource, destination: TransformDestination, groupBy: TransformPivot["group_by"], aggregations: TransformPivot["aggregations"], settings: TransformSettings, slo: SLODefinition) => TransformPutTransformRequest;
