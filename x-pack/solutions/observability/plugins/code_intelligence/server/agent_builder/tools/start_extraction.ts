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

import { MAX_BATCH_REPOSITORIES } from '../../../common/extraction_batch';
import {
  MAX_REPOSITORY_IDENTITY_LENGTH,
  MAX_REVISION_LENGTH,
} from '../../../common/repository_settings';
import { START_EXTRACTION_ERROR_CODES } from '../../../common/start_extraction_errors';
import { ElasticsearchCatalogWriter } from '../../adapters/elasticsearch_catalog';
import { ElasticsearchFindingsWriter } from '../../adapters/elasticsearch_findings';
import {
  describeStartFailure,
  listExtractableRepositories,
  selectBatchRepositories,
  type ExtractionRefusal,
} from '../../repository_service';
import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({
  repositories: z
    .array(
      z.object({
        repository: z
          .string()
          .min(3)
          .max(MAX_REPOSITORY_IDENTITY_LENGTH)
          .describe('Repository identity as owner/name.'),
        revision: z
          .string()
          .min(1)
          .max(MAX_REVISION_LENGTH)
          .optional()
          .describe("Branch, tag, or commit SHA. Defaults to the repository's default ref."),
      })
    )
    .min(1)
    .max(MAX_BATCH_REPOSITORIES)
    .describe('The repositories the user named. Never add repositories the user did not name.'),
});

const refusalResult = ({ code, message, repository, extractionId }: ExtractionRefusal) =>
  createErrorResult({
    message,
    metadata: {
      ...(code === undefined ? {} : { code }),
      ...(repository === undefined ? {} : { repository }),
      ...(extractionId === undefined ? {} : { extractionId }),
    },
  });

export const createStartExtractionTool = ({
  catalogIndex,
  findingsIndex,
  settingsIndex,
  getServices,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.startExtraction,
  type: ToolType.builtin,
  description: `Starts 1 Code Intelligence extraction batch for the named repositories. Extraction reads the source code, finds what it logs and which OpenTelemetry spans, metrics, and attributes it emits, and replaces the catalog entries of each repository. It takes several minutes and returns a batch id; poll the get extraction status tool with that id.

When to use:
- Only when the user explicitly asks to extract, re-extract, or refresh specific repositories.

Each repository must already be configured; add it first with the upsert repository tool. Only 1 batch runs at a time.`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Start Code Intelligence Extraction',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.startExtraction.confirmation.title',
        { defaultMessage: 'Start Code Intelligence extraction' }
      ),
      message: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.startExtraction.confirmation.message',
        {
          defaultMessage:
            'Extract {repositories}? Extraction runs model calls for several minutes and replaces the catalog entries of each repository.',
          values: {
            repositories: toolParams.repositories
              .map(({ repository, revision }) =>
                revision === undefined ? repository : `${repository}@${revision}`
              )
              .join(', '),
          },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.startExtraction.confirmation.confirm',
        { defaultMessage: 'Start extraction' }
      ),
      cancel_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.startExtraction.confirmation.cancel',
        { defaultMessage: 'Cancel' }
      ),
    }),
  },
  handler: async ({ repositories }, { esClient, request, spaceId }) => {
    const { extractionService, extractionUnavailableReason } = getServices();
    if (extractionService === undefined) {
      return {
        results: [
          refusalResult({
            code: START_EXTRACTION_ERROR_CODES.sandboxUnavailable,
            message: extractionUnavailableReason ?? 'Extraction is unavailable.',
          }),
        ],
      };
    }
    const client = esClient.asCurrentUser;
    const selection = selectBatchRepositories(
      repositories,
      await listExtractableRepositories(client, settingsIndex)
    );
    if (!selection.ok) return { results: [refusalResult(selection)] };
    try {
      const id = await extractionService.start(selection.selected, request, spaceId, {
        catalogWriter: new ElasticsearchCatalogWriter(client, catalogIndex),
        findingsWriter: new ElasticsearchFindingsWriter(client, findingsIndex),
      });
      return {
        results: [
          createOtherResult({
            id,
            repositories: selection.selected.map(({ repository, revision }) => ({
              repository,
              revision,
            })),
          }),
        ],
      };
    } catch (error) {
      const failure = describeStartFailure(error);
      if (failure === undefined) throw error;
      return { results: [refusalResult(failure)] };
    }
  },
});
