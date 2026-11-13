/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { getPromptsByGroupId } from '@kbn/ai-prompts';
import {
  BUNDLED_INVESTIGATOR_PROMPTS,
  INVESTIGATOR_PROMPT_IDS,
  NIGHTSHIFT_PROMPT_GROUP_ID,
  localPrompts,
  type InvestigatorPromptKey,
  type InvestigatorPrompts,
} from '../agents/investigation/prompts';

const PROMPT_KEYS = Object.keys(INVESTIGATOR_PROMPT_IDS) as InvestigatorPromptKey[];

/**
 * Returns a function that reads the investigator's prompts from the installed `nightshift_prompts`
 * package, falling back to the bundled prompts for any the package does not ship. It never
 * rejects: a failed read logs and returns the bundled prompts.
 *
 * `getSavedObjectsClient` must read every space: the prompts are space-agnostic system content
 * that no feature privilege grants to the user running the investigation.
 */
export const createInvestigatorPromptsResolver = ({
  getSavedObjectsClient,
  onResolve,
  logger,
}: {
  getSavedObjectsClient: () => SavedObjectsClientContract | undefined;
  /** Runs before every read, so the package can be installed or upgraded in the background. */
  onResolve?: () => void;
  logger: Logger;
}): (() => Promise<InvestigatorPrompts>) => {
  return async () => {
    onResolve?.();
    const savedObjectsClient = getSavedObjectsClient();
    if (!savedObjectsClient) {
      return BUNDLED_INVESTIGATOR_PROMPTS;
    }
    try {
      const prompts = await getPromptsByGroupId({
        localPrompts,
        promptGroupId: NIGHTSHIFT_PROMPT_GROUP_ID,
        promptIds: PROMPT_KEYS.map((key) => INVESTIGATOR_PROMPT_IDS[key]),
        savedObjectsClient,
      });
      const byId = new Map(prompts.map(({ promptId, prompt }) => [promptId, prompt]));
      return Object.fromEntries(
        PROMPT_KEYS.map((key) => [
          key,
          byId.get(INVESTIGATOR_PROMPT_IDS[key]) ?? BUNDLED_INVESTIGATOR_PROMPTS[key],
        ])
      ) as Record<InvestigatorPromptKey, string>;
    } catch (error) {
      logger.warn(`Failed to read installed investigator prompts: ${error.message}`);
      return BUNDLED_INVESTIGATOR_PROMPTS;
    }
  };
};
