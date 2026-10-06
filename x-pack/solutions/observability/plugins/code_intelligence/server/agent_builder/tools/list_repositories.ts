/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';

import { summarizeCatalog } from '../../catalog_service';
import { listExtractableRepositories } from '../../repository_service';
import {
  CATALOG_QUERY_NOTE,
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({});

export const createListRepositoriesTool = ({
  catalogIndex,
  settingsIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.listRepositories,
  type: ToolType.builtin,
  description: `Lists the repositories configured in the Code Intelligence catalog, with their remote URL, default ref, whether they are enabled, and how many catalog entries each has per severity level.

When to use:
- The user asks which repositories or services are in the code intelligence catalog.
- Before searching the catalog, to find the exact owner/name identity of a repository.
- Before starting an extraction, to check that a repository is configured.

${CATALOG_QUERY_NOTE}`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'List Code Intelligence Repositories',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (_args, { esClient }) => {
    const client = esClient.asCurrentUser;
    const [repositories, summaries] = await Promise.all([
      listExtractableRepositories(client, settingsIndex),
      summarizeCatalog(client, catalogIndex),
    ]);
    const counts = new Map(summaries.map((summary) => [summary.repository, summary]));
    return {
      results: [
        createOtherResult({
          repositories: repositories.map(
            ({ repository, remoteUrl, defaultRef, enabled, githubConnectorId }) => {
              const summary = counts.get(repository);
              return {
                repository,
                remoteUrl,
                defaultRef,
                enabled,
                ...(githubConnectorId === undefined ? {} : { githubConnectorId }),
                catalogEntries: {
                  total: summary?.total ?? 0,
                  severities: summary?.severities ?? {
                    low: 0,
                    medium: 0,
                    high: 0,
                    critical: 0,
                  },
                },
              };
            }
          ),
        }),
      ],
    };
  },
});
