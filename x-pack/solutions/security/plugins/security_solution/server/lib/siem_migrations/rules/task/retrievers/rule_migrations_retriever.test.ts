/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElserPopulateError } from '../../../common/data/elser_populate_error';
import { RuleMigrationsRetriever } from './rule_migrations_retriever';
import type { RuleMigrationsRetrieverDeps } from './rule_migrations_retriever';
import { IntegrationRetriever } from './integration_retriever';
import { PrebuiltRulesRetriever } from './prebuilt_rules_retriever';
import { RuleResourceRetriever } from './rule_resource_retriever';
import { ELSER_COLD_START_MESSAGE, ELSER_NOT_DEPLOYED_MESSAGE } from './get_elser_error_message';

jest.mock('./integration_retriever');
jest.mock('./prebuilt_rules_retriever');
jest.mock('./rule_resource_retriever');

const MockIntegrationRetriever = IntegrationRetriever as jest.MockedClass<
  typeof IntegrationRetriever
>;
const MockPrebuiltRulesRetriever = PrebuiltRulesRetriever as jest.MockedClass<
  typeof PrebuiltRulesRetriever
>;
const MockRuleResourceRetriever = RuleResourceRetriever as jest.MockedClass<
  typeof RuleResourceRetriever
>;

describe('RuleMigrationsRetriever initialize()', () => {
  let integrationsPopulateIndex: jest.Mock;
  let prebuiltRulesPopulateIndex: jest.Mock;

  const buildRetriever = () =>
    new RuleMigrationsRetriever('migration-1', {
      data: { resources: {} },
    } as unknown as RuleMigrationsRetrieverDeps);

  beforeEach(() => {
    jest.clearAllMocks();
    // The retriever dedupes populate across instances via a static promise; reset it so
    // each test starts from a clean state and is not affected by test ordering.
    (
      RuleMigrationsRetriever as unknown as { populatePromise: Promise<void> | null }
    ).populatePromise = null;

    integrationsPopulateIndex = jest.fn().mockResolvedValue(undefined);
    prebuiltRulesPopulateIndex = jest.fn().mockResolvedValue(undefined);

    MockIntegrationRetriever.mockImplementation(
      () => ({ populateIndex: integrationsPopulateIndex } as unknown as IntegrationRetriever)
    );
    MockPrebuiltRulesRetriever.mockImplementation(
      () => ({ populateIndex: prebuiltRulesPopulateIndex } as unknown as PrebuiltRulesRetriever)
    );
    MockRuleResourceRetriever.mockImplementation(
      () =>
        ({ initialize: jest.fn().mockResolvedValue(undefined) } as unknown as RuleResourceRetriever)
    );
  });

  it('rethrows an unrelated error without masking it', async () => {
    prebuiltRulesPopulateIndex.mockRejectedValue(new Error('boom'));

    await expect(buildRetriever().initialize()).rejects.toThrow('boom');
  });

  it('surfaces the deploy guidance when the ELSER model is not deployed', async () => {
    prebuiltRulesPopulateIndex.mockRejectedValue(
      new ElserPopulateError(
        'Inference endpoint not found [.elser-2-elasticsearch]',
        'resource_not_found_exception'
      )
    );

    await expect(buildRetriever().initialize()).rejects.toThrow(ELSER_NOT_DEPLOYED_MESSAGE);
  });

  it('surfaces the retry guidance when ELSER is still starting up', async () => {
    prebuiltRulesPopulateIndex.mockRejectedValue(
      new ElserPopulateError(
        'Timed out after [10s] waiting for trained model deployment [.elser-2-elasticsearch] to start',
        'model_deployment_timeout_exception'
      )
    );

    await expect(buildRetriever().initialize()).rejects.toThrow(ELSER_COLD_START_MESSAGE);
  });

  it('shares a single populate outcome across concurrent migrations', async () => {
    prebuiltRulesPopulateIndex.mockRejectedValue(
      new ElserPopulateError(
        'Timed out after [10s] waiting for trained model deployment [.elser-2-elasticsearch] to start',
        'model_deployment_timeout_exception'
      )
    );

    const first = buildRetriever();
    const second = buildRetriever();
    const results = await Promise.allSettled([first.initialize(), second.initialize()]);

    // Both concurrent callers observe the same shared outcome...
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    // ...and the underlying populate runs only once for the shared promise.
    expect(prebuiltRulesPopulateIndex).toHaveBeenCalledTimes(1);
  });
});
