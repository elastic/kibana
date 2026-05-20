import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../domain/models';
export interface SummaryTransformGenerator {
    generate(slo: SLODefinition): TransformPutTransformRequest;
}
export declare class DefaultSummaryTransformGenerator implements SummaryTransformGenerator {
    generate(slo: SLODefinition): TransformPutTransformRequest;
}
