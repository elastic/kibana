import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath } from '@kbn/core-http-server';
import type { SLODefinition } from '../../domain/models';
export declare const getSummaryPipelineTemplate: (slo: SLODefinition, spaceId: string, basePath: IBasePath) => IngestPutPipelineRequest;
