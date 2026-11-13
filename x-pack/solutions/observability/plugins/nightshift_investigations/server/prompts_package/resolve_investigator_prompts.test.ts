/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Prompt } from '@kbn/ai-prompts';
import {
  BUNDLED_INVESTIGATOR_PROMPTS,
  INVESTIGATOR_PROMPT_IDS,
  NIGHTSHIFT_PROMPT_GROUP_ID,
} from '../agents/investigation/prompts';
import { createInvestigatorPromptsResolver } from './resolve_investigator_prompts';

const installedPrompt = (promptId: string, text: string) => ({
  id: promptId,
  type: 'security-ai-prompt',
  score: 1,
  references: [],
  attributes: {
    promptGroupId: NIGHTSHIFT_PROMPT_GROUP_ID,
    promptId,
    prompt: { default: text },
  } satisfies Prompt,
});

describe('createInvestigatorPromptsResolver', () => {
  it('uses the installed prompts and keeps the bundled one for any the package lacks', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [installedPrompt(INVESTIGATOR_PROMPT_IDS.instructions, 'Published {{x}}')],
      total: 1,
      per_page: 20,
      page: 1,
    });
    const onResolve = jest.fn();

    const prompts = await createInvestigatorPromptsResolver({
      getSavedObjectsClient: () => savedObjectsClient,
      onResolve,
      logger: loggerMock.create(),
    })();

    expect(onResolve).toHaveBeenCalled();
    expect(prompts).toEqual({
      ...BUNDLED_INVESTIGATOR_PROMPTS,
      instructions: 'Published {{x}}',
    });
  });

  it('returns the bundled prompts and warns when the installed prompts cannot be read', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockRejectedValue(new Error('Unsupported saved object type'));
    const logger = loggerMock.create();

    const prompts = await createInvestigatorPromptsResolver({
      getSavedObjectsClient: () => savedObjectsClient,
      logger,
    })();

    expect(prompts).toBe(BUNDLED_INVESTIGATOR_PROMPTS);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read installed investigator prompts: Unsupported saved object type'
    );
  });
});
