import type { RecursivePartial } from '@elastic/eui';
import type { CreateSLOInput, SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare function transformSloToCloneState(slo: SLOWithSummaryResponse | SLODefinitionResponse): RecursivePartial<CreateSLOInput>;
