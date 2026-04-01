/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export const WORKFLOW_ID_ALIASES_TO_TAGS: Readonly<Record<string, string>> = {
  'attack-discovery-custom-validation-example': 'attackDiscovery:custom_validation_example',
  'attack-discovery-esql-example': 'attackDiscovery:esql_example_alert_retrieval',
  'attack-discovery-generation': 'attackDiscovery:generation',
  'attack-discovery-run-example': 'attackDiscovery:run_example',
  'attack-discovery-validate': 'attackDiscovery:validate',
  'default-attack-discovery-alert-retrieval': 'attackDiscovery:default_alert_retrieval',
};

const resolvedWorkflowIdByAlias = new Map<string, string | null>();

/** Visible for testing — clears the module-level cache. */
export const clearResolvedWorkflowIdCache = (): void => {
  resolvedWorkflowIdByAlias.clear();
};

export const resolveWorkflowIdFromAlias = async ({
  alias,
  http,
}: {
  alias: string;
  http: HttpSetup;
}): Promise<string | null> => {
  const cached = resolvedWorkflowIdByAlias.get(alias);
  if (cached !== undefined) {
    return cached;
  }

  const tag = WORKFLOW_ID_ALIASES_TO_TAGS[alias];
  if (!tag) {
    resolvedWorkflowIdByAlias.set(alias, null);
    return null;
  }

  try {
    const response = await http.fetch<{
      results?: Array<{ id: string }>;
    }>('/api/workflows', {
      method: 'GET',
      query: {
        page: 1,
        size: 1,
        tags: tag,
      },
      version: '2023-10-31',
    });

    const resolvedId = response.results?.[0]?.id ?? null;
    resolvedWorkflowIdByAlias.set(alias, resolvedId);
    return resolvedId;
  } catch {
    // If the Workflows API isn't available (or the user lacks access), we don't want to break the
    // Attack Discovery UI — just omit the link.
    resolvedWorkflowIdByAlias.set(alias, null);
    return null;
  }
};
