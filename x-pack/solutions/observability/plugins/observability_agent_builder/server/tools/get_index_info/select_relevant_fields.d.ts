import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
interface FieldWithType {
    name: string;
    type: string;
}
/**
 * Uses an LLM to filter a large list of fields down to those relevant to the user's intent.
 */
export declare function selectRelevantFields({ intent, candidateFields, inferenceClient, logger, }: {
    intent: string;
    candidateFields: FieldWithType[];
    inferenceClient: BoundInferenceClient;
    logger: Logger;
}): Promise<FieldWithType[]>;
export {};
