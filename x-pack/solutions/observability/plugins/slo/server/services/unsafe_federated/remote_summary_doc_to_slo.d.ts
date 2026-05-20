import type { Logger } from '@kbn/logging';
import type { SLODefinition } from '../../domain/models';
import type { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';
export declare function fromRemoteSummaryDocumentToSloDefinition(summaryDoc: EsSummaryDocument, logger: Logger): SLODefinition | undefined;
