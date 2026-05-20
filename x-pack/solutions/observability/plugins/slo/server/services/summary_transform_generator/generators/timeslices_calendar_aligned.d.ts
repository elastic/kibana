import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../../domain/models';
export declare function generateSummaryTransformForTimeslicesAndCalendarAligned(slo: SLODefinition): TransformPutTransformRequest;
