/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { isEmpty } from 'lodash/fp';

import type { ThreatHuntingPrioritiesGraphState, ThreatHuntingPriority } from '../../../../state';
import { getThreatHuntingPrioritiesGenerationSchema } from '../../schemas';
import type { CombinedPrompts } from '../../prompts';
import { extractJson } from '../../../../../langchain/output_chunking/nodes/helpers/extract_json';
import { addTrailingBackticksIfNecessary } from '../../../../../langchain/output_chunking/nodes/helpers/add_trailing_backticks_if_necessary';
import { generationsAreRepeating } from '../../../../../langchain/output_chunking/nodes/helpers/generations_are_repeating';
import { getCombined } from '../../../../../langchain/output_chunking/nodes/helpers/get_combined';

/**
 * Simple hallucination detection for threat hunting priorities
 * Checks if the response contains placeholder-like patterns that suggest hallucination
 */
const responseIsHallucinated = (response: string): boolean => {
  // Check for placeholder patterns that suggest the LLM is hallucinating entity values
  return (
    response.includes('{{ host.name hostNameValue }}') ||
    response.includes('{{ user.name userNameValue }}')
  );
};

/**
 * Discards previous refinements and resets state
 */
const discardPreviousRefinements = (
  state: ThreatHuntingPrioritiesGraphState,
  isHallucinationDetected: boolean
): ThreatHuntingPrioritiesGraphState => {
  return {
    ...state,
    combinedRefinements: '',
    generationAttempts: state.generationAttempts + 1,
    refinements: [],
    hallucinationFailures: isHallucinationDetected
      ? state.hallucinationFailures + 1
      : state.hallucinationFailures,
  };
};

/**
 * Creates the combined refine prompt with unrefined priorities
 */
const getCombinedRefinePrompt = (
  prompt: string,
  refinePrompt: string,
  continuePrompt: string,
  combinedRefinements: string,
  unrefinedResults: ThreatHuntingPriority[] | null
): string => {
  const baseQuery = `${prompt}

${refinePrompt}

"""
\`\`\`json
{
  "priorities": ${JSON.stringify(unrefinedResults, null, 2)}
}
\`\`\`
"""

`;

  return isEmpty(combinedRefinements)
    ? baseQuery
    : `${baseQuery}

${continuePrompt}

"""
${combinedRefinements}
"""

`;
};

export const getRefinePrioritiesNode = ({
  llm,
  logger,
  prompts,
}: {
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: CombinedPrompts;
}): ((state: ThreatHuntingPrioritiesGraphState) => Promise<ThreatHuntingPrioritiesGraphState>) => {
  const refinePriorities = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---REFINE PRIORITIES---');

    const {
      prompt,
      refinePrompt,
      continuePrompt,
      combinedRefinements,
      unrefinedResults,
      generationAttempts,
      hallucinationFailures,
      maxGenerationAttempts,
      maxHallucinationFailures,
      maxRepeatedGenerations,
      refinements,
    } = state;

    if (!unrefinedResults || unrefinedResults.length === 0) {
      logger?.warn(() => 'No unrefined results to refine');
      return {
        ...state,
        priorities: state.priorities,
      };
    }

    // Check if we've exceeded max attempts
    if (generationAttempts >= maxGenerationAttempts) {
      logger?.warn(
        () => `Max generation attempts (${maxGenerationAttempts}) reached, using unrefined results`
      );
      return {
        ...state,
        priorities: unrefinedResults,
      };
    }

    // Check if we've exceeded max hallucination failures
    if (hallucinationFailures >= maxHallucinationFailures) {
      logger?.warn(
        () =>
          `Max hallucination failures (${maxHallucinationFailures}) reached, using unrefined results`
      );
      return {
        ...state,
        priorities: unrefinedResults,
      };
    }

    let partialResponse = '';
    let combinedResponse = '';

    try {
      const generationSchema = getThreatHuntingPrioritiesGenerationSchema(prompts);
      const outputParser = StructuredOutputParser.fromZodSchema(generationSchema);
      const formatInstructions = outputParser.getFormatInstructions();

      const query = getCombinedRefinePrompt(
        prompt,
        refinePrompt ||
          'Review and refine the following threat hunting priorities. Merge priorities that share entities or represent the same threat pattern. Remove low-quality priorities. Improve descriptions and tags.',
        continuePrompt,
        combinedRefinements,
        unrefinedResults
      );

      const chatPrompt = ChatPromptTemplate.fromTemplate(
        `Answer the user's question as best you can:\n{format_instructions}\n{query}`
      );

      const chain = chatPrompt.pipe(llm);
      const llmType = llm._llmType();

      logger?.debug(
        () =>
          `Refine priorities node is invoking the chain (${llmType}), attempt ${generationAttempts}`
      );

      const rawResponse = (await chain.invoke({
        format_instructions: formatInstructions,
        query,
      })) as unknown as string;

      // Extract JSON from response
      partialResponse = extractJson(rawResponse);

      // Check for hallucinations
      if (responseIsHallucinated(partialResponse)) {
        logger?.debug(
          () =>
            `Refine priorities node detected a hallucination (${llmType}), on attempt ${generationAttempts}; discarding accumulated refinements and starting over`
        );

        return discardPreviousRefinements(state, true);
      }

      // Check for repeating generations
      if (
        generationsAreRepeating({
          currentGeneration: partialResponse,
          previousGenerations: refinements,
          sampleLastNGenerations: maxRepeatedGenerations - 1,
        })
      ) {
        logger?.debug(
          () =>
            `Refine priorities node detected ${maxRepeatedGenerations} repeated generations on attempt ${generationAttempts}; discarding accumulated results and starting over`
        );

        return discardPreviousRefinements(state, false);
      }

      // Combine with previous refinements
      combinedResponse = getCombined({ combinedGenerations: combinedRefinements, partialResponse });

      // Parse and validate the response
      const extractedJson = extractJson(addTrailingBackticksIfNecessary(combinedResponse));
      const unvalidatedParsed = JSON.parse(extractedJson);
      const validatedResponse = generationSchema.parse(unvalidatedParsed);

      const refinedPriorities = validatedResponse.priorities || [];

      logger?.debug(
        () =>
          `Refined ${refinedPriorities.length} priorities (from ${unrefinedResults.length} unrefined)`
      );

      return {
        ...state,
        priorities: refinedPriorities,
        combinedRefinements: combinedResponse,
        refinements: [...refinements, partialResponse],
        generationAttempts: generationAttempts + 1,
      };
    } catch (error) {
      logger?.error(() => `Error refining priorities: ${error}`);
      return {
        ...state,
        errors: [...(state.errors || []), `Error refining priorities: ${error}`],
        generationAttempts: generationAttempts + 1,
        // On error, try to use what we have or fall back to unrefined
        priorities: state.priorities || unrefinedResults,
      };
    }
  };

  return refinePriorities;
};
