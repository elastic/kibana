/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DIFFABLE_CHANGE_ACTIONS } from '../../../public/detection_engine/rule_details_ui/components/changes_history_timeline/constants';
import { getChangesHistoryUsage, REVISION_SAVED_ACTIONS } from './get_changes_history_usage';

interface ChangesHistoryUsageAggs {
  revision_saved?: { doc_count: number };
  rule_restored?: { doc_count: number };
}

const getMockChangesHistoryResponse = ({
  revisionSavedDocCount,
  ruleRestoredDocCount,
}: {
  revisionSavedDocCount: number;
  ruleRestoredDocCount: number;
}): SearchResponse<never, ChangesHistoryUsageAggs> => ({
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
  aggregations: {
    revision_saved: { doc_count: revisionSavedDocCount },
    rule_restored: { doc_count: ruleRestoredDocCount },
  },
});

describe('get_changes_history_usage', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  });

  test('revision_saved counts diffable-action docs in the window', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(
      getMockChangesHistoryResponse({ revisionSavedDocCount: 3, ruleRestoredDocCount: 0 })
    );

    const result = await getChangesHistoryUsage({ esClient, logger });

    expect(result.revision_saved).toEqual(3);
  });

  test('revision_saved is zero when no matching docs exist in the window', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(
      getMockChangesHistoryResponse({ revisionSavedDocCount: 0, ruleRestoredDocCount: 0 })
    );

    const result = await getChangesHistoryUsage({ esClient, logger });

    expect(result.revision_saved).toEqual(0);
  });

  test('rule_restored counts only rule_restore docs, independent of revision_saved', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(
      getMockChangesHistoryResponse({ revisionSavedDocCount: 0, ruleRestoredDocCount: 1 })
    );

    const result = await getChangesHistoryUsage({ esClient, logger });

    expect(result).toEqual({ revision_saved: 0, rule_restored: 1 });
  });

  test('rule_restored is zero when revision_saved has docs but no restore docs exist', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockResponseOnce(
      getMockChangesHistoryResponse({ revisionSavedDocCount: 5, ruleRestoredDocCount: 0 })
    );

    const result = await getChangesHistoryUsage({ esClient, logger });

    expect(result).toEqual({ revision_saved: 5, rule_restored: 0 });
  });

  test('degrades to both-zero on ES error and does not throw', async () => {
    const logger = loggingSystemMock.createLogger();
    esClient.search.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await getChangesHistoryUsage({ esClient, logger });

    expect(result).toEqual({ revision_saved: 0, rule_restored: 0 });
    expect(logger.debug).toHaveBeenCalled();
  });

  test('REVISION_SAVED_ACTIONS stays in sync with the UI DIFFABLE_CHANGE_ACTIONS taxonomy', () => {
    expect([...REVISION_SAVED_ACTIONS].sort()).toEqual([...DIFFABLE_CHANGE_ACTIONS].sort());
  });
});
