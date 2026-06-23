/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { EntityStoreCoreSetup } from '../../types';
import { EntityStoreResolutionDisabledRulesTypeName } from '../../domain/saved_objects';
import type { ResolutionDisabledRules } from '../../domain/saved_objects';
import type { EntityMaintainerTaskMethodContext } from '../../tasks/entity_maintainers/types';
import { RESOLUTION_RULE_IDS } from '../../../common/domain/resolution_rules/constants';
import { createAutomatedResolutionMaintainerConfig, MAINTAINER_ID } from '.';
import type { AutomatedResolutionState } from './types';

const EMAIL_RULE = RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH;

const NAMESPACE = 'default';

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

const disabledRulesFindResponse = (
  disabledRuleIds?: string[]
): SavedObjectsFindResponse<ResolutionDisabledRules> => {
  if (disabledRuleIds === undefined) {
    return {
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as SavedObjectsFindResponse<ResolutionDisabledRules>;
  }
  return {
    total: 1,
    page: 1,
    per_page: 1,
    saved_objects: [
      {
        id: `${EntityStoreResolutionDisabledRulesTypeName}-${NAMESPACE}`,
        type: EntityStoreResolutionDisabledRulesTypeName,
        references: [],
        attributes: { disabledRuleIds },
        score: 0,
      },
    ],
  } as unknown as SavedObjectsFindResponse<ResolutionDisabledRules>;
};

const setup = (disabledRuleIds?: string[]) => {
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockResolvedValue(disabledRulesFindResponse(disabledRuleIds));

  const core = {
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ savedObjects: { getScopedClient: () => soClient } }]),
  } as unknown as EntityStoreCoreSetup;

  const esClient = {
    search: jest.fn().mockResolvedValue(noEmailsSearchResponse),
  } as unknown as jest.Mocked<ElasticsearchClient>;

  return { soClient, core, esClient };
};

const runConfig = async (
  core: EntityStoreCoreSetup,
  esClient: ElasticsearchClient,
  persistedState: unknown
): Promise<AutomatedResolutionState> => {
  const config = createAutomatedResolutionMaintainerConfig(core);
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
    fakeRequest: {} as KibanaRequest,
    esClient,
    cpsEsClient: esClient,
  } as unknown as EntityMaintainerTaskMethodContext;

  const result = await config.run(context);
  return result as unknown as AutomatedResolutionState;
};

describe('createAutomatedResolutionMaintainerConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers under the stable maintainer id and requires enterprise license', () => {
    const { core } = setup();
    const config = createAutomatedResolutionMaintainerConfig(core);
    expect(config.id).toBe(MAINTAINER_ID);
    expect(config.minLicense).toBe('enterprise');
  });

  it('seeds initialState with an empty rules map (rules backfill on first run)', () => {
    const { core } = setup();
    const config = createAutomatedResolutionMaintainerConfig(core);
    const state = config.initialState as unknown as AutomatedResolutionState;
    expect(state.rules).toEqual({});
  });

  it('migrates the legacy single-rule state and runs the email rule once', async () => {
    const { core, esClient } = setup();

    const result = await runConfig(core, esClient, {
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

  it('treats all rules as enabled when the disabled-rules SO does not exist', async () => {
    const { core, esClient, soClient } = setup();

    const result = await runConfig(core, esClient, { lastProcessedTimestamp: null, lastRun: null });

    // The disabled-rules SO was consulted but, being absent, the email rule still ran.
    expect(soClient.find).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 0,
      skippedAmbiguousBuckets: 0,
    });
  });

  it('advances the email rule watermark to maxTimestamp when enabled and ES returns buckets', async () => {
    const { core, esClient } = setup();
    (esClient.search as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce(collectEmailsResponse('2026-03-10T00:00:00Z'))
      .mockResolvedValueOnce(noMatchGroupsResponse);

    const result = await runConfig(core, esClient, {
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

  it('treats the email rule as enabled when only an unrelated rule is disabled', async () => {
    // SO present with an unrelated rule disabled; the email rule is not in the list and must run.
    const { core, esClient } = setup(['some_other_rule']);

    const result = await runConfig(core, esClient, { lastProcessedTimestamp: null, lastRun: null });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 0,
      skippedAmbiguousBuckets: 0,
    });
  });

  it('skips the email rule when it is in the disabled list, without advancing its watermark', async () => {
    const { core, esClient } = setup([EMAIL_RULE]);

    const result = await runConfig(core, esClient, {
      lastProcessedTimestamp: '2026-01-01T00:00:00Z',
      lastRun: { resolutionsCreated: 5, skippedAmbiguousBuckets: 1 },
    });

    expect(esClient.search).not.toHaveBeenCalled();
    // State preserved untouched from the migrated input.
    expect(result.rules[EMAIL_RULE]).toEqual({
      lastProcessedTimestamp: '2026-01-01T00:00:00Z',
      lastRun: { resolutionsCreated: 5, skippedAmbiguousBuckets: 1 },
    });
  });
});
