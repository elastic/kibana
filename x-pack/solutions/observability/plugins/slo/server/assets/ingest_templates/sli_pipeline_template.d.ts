import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { SLODefinition } from '../../domain/models';
export declare const getSLIPipelineTemplate: (slo: SLODefinition, spaceId: string) => IngestPutPipelineRequest;
