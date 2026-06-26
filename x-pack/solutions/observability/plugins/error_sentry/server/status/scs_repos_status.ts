/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SCS_CODE_INDEX_PATTERN, SCS_LOCATIONS_SUFFIX } from '../../common/constants';
import type { ComponentStatus } from '../../common/constants';

export const getScsReposStatus = async (
  esClient: ElasticsearchClient
): Promise<ComponentStatus> => {
  const response = await esClient.cat.indices({
    index: SCS_CODE_INDEX_PATTERN,
    h: ['index'],
    format: 'json',
  });

  // Keep only primary repo indices: code-{org}_{repo}
  // Exclude: code-history-* (git history), *_settings, *_locations
  const primaryIndices = response
    .map((r) => r.index ?? '')
    .filter(
      (idx) =>
        idx &&
        idx.startsWith('code-') &&
        !idx.startsWith('code-history-') &&
        !idx.endsWith(SCS_LOCATIONS_SUFFIX) &&
        !idx.endsWith('_settings')
    );

  // Convert "code-{org}_{repo}" → "{org}/{repo}" by stripping prefix and replacing first "_"
  const repoNames = primaryIndices.map((idx) => idx.slice('code-'.length).replace('_', '/'));

  if (repoNames.length === 0) {
    return {
      id: 'scs_repos',
      label: 'Ingested code repositories',
      state: 'warning',
      detail:
        'No ingested code repositories found. Run scs index <repo-url> to ingest a repository. Investigation accuracy will be limited without code context.',
      repairable: false,
    };
  }

  return {
    id: 'scs_repos',
    label: 'Ingested code repositories',
    state: 'ok',
    detail: repoNames.join(', '),
    repairable: false,
  };
};
