/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';

import { GenerationPrompts } from '../helpers/prompts';
import { discardPreviousGenerations } from './helpers/discard_previous_generations';
import { extractJson } from '../helpers/extract_json';
import { getAnonymizedAlertsFromState } from './helpers/get_anonymized_alerts_from_state';
import { getChainWithFormatInstructions } from '../helpers/get_chain_with_format_instructions';
import { getCombined } from '../helpers/get_combined';
import { getCombinedAttackDiscoveryPrompt } from '../helpers/get_combined_attack_discovery_prompt';
import { generationsAreRepeating } from '../helpers/generations_are_repeating';
import { getUseUnrefinedResults } from './helpers/get_use_unrefined_results';
import { parseCombinedOrThrow } from '../helpers/parse_combined_or_throw';
import { responseIsHallucinated } from '../helpers/response_is_hallucinated';
import type { GraphState } from '../../types';

export const getGenerateNode = ({
  llm,
  logger,
  prompts,
}: {
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: GenerationPrompts;
}): ((state: GraphState) => Promise<GraphState>) => {
  const generate = async (state: GraphState): Promise<GraphState> => {
    logger?.debug(() => `---GENERATE---`);

    const anonymizedAlerts: string[] = getAnonymizedAlertsFromState(state);

    const {
      attackDiscoveryPrompt,
      continuePrompt,
      combinedGenerations,
      generationAttempts,
      generations,
      hallucinationFailures,
      maxGenerationAttempts,
      maxRepeatedGenerations,
    } = state;

    let combinedResponse = ''; // mutable, because it must be accessed in the catch block
    let partialResponse = ''; // mutable, because it must be accessed in the catch block

    try {
      const query = getCombinedAttackDiscoveryPrompt({
        anonymizedAlerts,
        attackDiscoveryPrompt,
        combinedMaybePartialResults: combinedGenerations,
        continuePrompt,
      });

      const { chain, formatInstructions, llmType } = getChainWithFormatInstructions({
        llm,
        prompts,
      });

      logger?.debug(
        () => `generate node is invoking the chain (${llmType}), attempt ${generationAttempts}`
      );

      const rawResponse = await chain.invoke({
        format_instructions: formatInstructions,
        query,
      });

      // LOCAL MUTATION:
      partialResponse = extractJson(rawResponse); // remove the surrounding ```json```

      // if the response is hallucinated, discard previous generations and start over:
      if (responseIsHallucinated(partialResponse)) {
        logger?.debug(
          () =>
            `generate node detected a hallucination (${llmType}), on attempt ${generationAttempts}; discarding the accumulated generations and starting over`
        );

        return discardPreviousGenerations({
          generationAttempts,
          hallucinationFailures,
          isHallucinationDetected: true,
          state,
        });
      }

      // if the generations are repeating, discard previous generations and start over:
      if (
        generationsAreRepeating({
          currentGeneration: partialResponse,
          previousGenerations: generations,
          sampleLastNGenerations: maxRepeatedGenerations - 1,
        })
      ) {
        logger?.debug(
          () =>
            `generate node detected (${llmType}), detected ${maxRepeatedGenerations} repeated generations on attempt ${generationAttempts}; discarding the accumulated results and starting over`
        );

        // discard the accumulated results and start over:
        return discardPreviousGenerations({
          generationAttempts,
          hallucinationFailures,
          isHallucinationDetected: false,
          state,
        });
      }

      // LOCAL MUTATION:
      combinedResponse = getCombined({ combinedGenerations, partialResponse }); // combine the new response with the previous ones

      const unrefinedResults = parseCombinedOrThrow({
        combinedResponse,
        generationAttempts,
        llmType,
        logger,
        nodeName: 'generate',
        prompts,
      });

      // use the unrefined results if we already reached the max number of retries:
      const useUnrefinedResults = getUseUnrefinedResults({
        generationAttempts,
        maxGenerationAttempts,
        unrefinedResults,
      });

      if (useUnrefinedResults) {
        logger?.debug(
          () =>
            `generate node is using unrefined results response (${llm._llmType()}) from attempt ${generationAttempts}, because all attempts have been used`
        );
      }

      return {
        ...state,
        attackDiscoveries: useUnrefinedResults ? unrefinedResults : null, // optionally skip the refinement step by returning the final answer
        combinedGenerations: combinedResponse,
        generationAttempts: generationAttempts + 1,
        generations: [...generations, partialResponse],
        unrefinedResults,
      };
    } catch (error) {
      const parsingError = `generate node is unable to parse (${llm._llmType()}) response from attempt ${generationAttempts}; (this may be an incomplete response from the model): ${error}`;
      logger?.debug(() => parsingError); // logged at debug level because the error is expected when the model returns an incomplete response

      return {
        ...state,
        combinedGenerations: combinedResponse,
        errors: [...state.errors, parsingError],
        generationAttempts: generationAttempts + 1,
        generations: [...generations, partialResponse],
      };
    }
  };

  return generate;
};
