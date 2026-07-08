/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityMaintainerTaskMethodContext } from '../../../../../tasks/entity_maintainers/types';
import {
  RESOLUTION_RULE_IDS,
  RESOLUTION_RULE_KINDS,
} from '../../../../../../common/domain/resolution_rules/constants';
import { automatedResolutionMaintainerConfig, MAINTAINER_ID } from '.';
import { runRelatedUserAliasResolution } from '../related_user_alias_resolution';
import type { AutomatedResolutionState } from './types';

const EMAIL_RULE = RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH;
const ALIAS_RESOLUTION_RULE = RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION;
const NAMESPACE = 'default';

jest.mock('../related_user_alias_resolution', () => ({
  runRelatedUserAliasResolution: jest.fn(),
}));

const DEFAULT_EFFECTIVE_RULES = [
  {
    id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    managed: true,
    enabled: true,
  },
  {
    id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
    kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
    managed: true,
    enabled: false,
  },
];

const noEmailsSearchResponse = {
  aggregations: {
    emails: { buckets: [] },
    max_timestamp: { value_as_string: '' },
  },
};

// Step 1 (collectNewEmailValues) response: one email, watermark candidate.
const collectEmailsResponse = (maxTimestamp: string) => ({
  aggregations: {
    emails: { buckets: [{ key: { email: 'a@test.com' }, doc_count: 1 }] },
    max_timestamp: { value_as_string: maxTimestamp },
  },
});

// Step 2 (findMatchingGroups) response: no groups, so nothing to resolve but
// the watermark still advances (no failed buckets).
const noMatchGroupsResponse = { aggregations: { email_groups: { buckets: [] } } };

const createEsClient = () =>
  ({
    search: jest.fn().mockResolvedValue(noEmailsSearchResponse),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const runConfig = async (
  esClient: ElasticsearchClient,
  persistedState: unknown,
  effectiveRules = DEFAULT_EFFECTIVE_RULES
): Promise<AutomatedResolutionState> => {
  const context = {
    status: {
      metadata: {
        namespace: NAMESPACE,
        runs: 1,
        lastSuccessTimestamp: null,
        lastErrorTimestamp: null,
      },
      state: persistedState,
      taskStatus: 'started',
    },
    abortController: new AbortController(),
    logger: loggerMock.create(),
    esClient,
    cpsEsClient: esClient,
    resolutionRulesClient: {
      getEffectiveRules: jest.fn().mockResolvedValue(effectiveRules),
    },
    telemetry: { report: jest.fn() },
  } as unknown as EntityMaintainerTaskMethodContext;

  const result = await automatedResolutionMaintainerConfig.run(context);
  return result as unknown as AutomatedResolutionState;
};

describe('automatedResolutionMaintainerConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers under the stable maintainer id and requires enterprise license', () => {
    expect(automatedResolutionMaintainerConfig.id).toBe(MAINTAINER_ID);
    expect(automatedResolutionMaintainerConfig.minLicense).toBe('enterprise');
  });

  it('seeds initialState with an empty rules map (rules backfill on first run)', () => {
    const state =
      automatedResolutionMaintainerConfig.initialState as unknown as AutomatedResolutionState;
    expect(state.rules).toEqual({});
  });

  it('migrates the legacy single-rule state and runs the email rule once', async () => {
    const esClient = createEsClient();

    const result = await runConfig(esClient, {
      lastProcessedTimestamp: '2026-01-01T00:00:00Z',
      lastRun: null,
    });

    // The email rule ran (Step 1 search issued) and its watermark survived the migration.
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.rules[EMAIL_RULE].lastProcessedTimestamp).toBe('2026-01-01T00:00:00Z');
    expect(result.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 0,
      skippedAmbiguousBuckets: 0,
    });
    // The old flat fields are gone after migration.
    expect(Object.hasOwn(result, 'lastProcessedTimestamp')).toBe(false);
  });

  it('advances the email rule watermark to maxTimestamp when ES returns buckets', async () => {
    const esClient = createEsClient();
    (esClient.search as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce(collectEmailsResponse('2026-03-10T00:00:00Z'))
      .mockResolvedValueOnce(noMatchGroupsResponse);

    const result = await runConfig(esClient, {
      lastProcessedTimestamp: '2026-03-09T00:00:00Z',
      lastRun: null,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(result.rules[EMAIL_RULE].lastProcessedTimestamp).toBe('2026-03-10T00:00:00Z');
    expect(result.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 0,
      skippedAmbiguousBuckets: 0,
    });
  });

  it('skips disabled alias resolution rule and preserves its existing state', async () => {
    const esClient = createEsClient();
    const aliasResolutionState = {
      lastProcessedTimestamp: '2026-06-01T00:00:00Z',
      lastRun: {
        seedsScanned: 10,
        linksCreated: 2,
      },
    };

    const result = await runConfig(
      esClient,
      { rules: { [ALIAS_RESOLUTION_RULE]: aliasResolutionState } },
      [
        {
          id: EMAIL_RULE,
          kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
          managed: true,
          enabled: false,
        },
        {
          id: ALIAS_RESOLUTION_RULE,
          kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
          managed: true,
          enabled: false,
        },
      ]
    );

    expect(runRelatedUserAliasResolution).not.toHaveBeenCalled();
    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.rules[ALIAS_RESOLUTION_RULE]).toEqual(aliasResolutionState);
  });
});
