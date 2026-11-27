/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import {
  createErrorResult,
  createOtherResult,
  type BuiltinToolDefinition,
} from '@kbn/agent-builder-server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

import {
  MAX_CONNECTOR_ID_LENGTH,
  MAX_REMOTE_URL_LENGTH,
  MAX_REPOSITORY_IDENTITY_LENGTH,
  MAX_REVISION_LENGTH,
} from '../../../common/repository_settings';
import { upsertRepository } from '../../repository_service';
import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({
  repository: z
    .string()
    .min(3)
    .max(MAX_REPOSITORY_IDENTITY_LENGTH)
    .describe('Repository identity as owner/name, for example "grafana/loki".'),
  remoteUrl: z
    .string()
    .min(1)
    .max(MAX_REMOTE_URL_LENGTH)
    .describe(
      'Credential-free https:// clone URL, for example "https://github.com/grafana/loki.git".'
    ),
  defaultRef: z
    .string()
    .min(1)
    .max(MAX_REVISION_LENGTH)
    .optional()
    .describe('Branch, tag, or commit SHA to extract by default. Defaults to HEAD.'),
  enabled: z
    .boolean()
    .optional()
    .describe('Whether extraction of every enabled repository includes it. Defaults to true.'),
  githubConnectorId: z
    .string()
    .min(1)
    .max(MAX_CONNECTOR_ID_LENGTH)
    .optional()
    .describe('Optional GitHub connector id for private repositories.'),
});

export const createUpsertRepositoryTool = ({
  settingsIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.upsertRepository,
  type: ToolType.builtin,
  description: `Adds a repository to the Code Intelligence catalog settings, or replaces the settings of an existing one. It does not extract the repository; call the start extraction tool afterwards when the user asks for that.

When to use:
- The user asks to add, register, or edit a repository in the code intelligence catalog.

Only call this tool when the user explicitly asks to add or change a repository.`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Add or Update a Code Intelligence Repository',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  confirmation: {
    askUser: 'once',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.upsertRepository.confirmation.title',
        { defaultMessage: 'Save Code Intelligence repository' }
      ),
      message: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.upsertRepository.confirmation.message',
        {
          defaultMessage: 'Save the settings of {repository} with the remote {remoteUrl}?',
          values: { repository: toolParams.repository, remoteUrl: toolParams.remoteUrl },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.upsertRepository.confirmation.confirm',
        { defaultMessage: 'Save' }
      ),
      cancel_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.upsertRepository.confirmation.cancel',
        { defaultMessage: 'Cancel' }
      ),
    }),
  },
  handler: async (input, { esClient }) => {
    const result = await upsertRepository(esClient.asCurrentUser, settingsIndex, input);
    if (!result.ok) {
      return {
        results: [
          createErrorResult({
            message: result.problems.map(({ message }) => message).join(' '),
            metadata: { problems: result.problems },
          }),
        ],
      };
    }
    return { results: [createOtherResult({ repository: result.repository })] };
  },
});
