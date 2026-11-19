/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { Dependency } from '../../../../../common/burn_rate_rule/types';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../../../common/constants';
import type { SLODefinitionRepository } from '../../../../services';
import { createSLO } from '../../../../services/fixtures/slo';
import { createSLORepositoryMock } from '../../../../services/mocks';
import { MAX_EVALUATION_RESULTS } from '../constants';
import { createEvaluationResponse } from '../fixtures/evaluation';
import { createBurnRateRule, createBurnRateRuleSavedObject } from '../fixtures/rule';
import { evaluateDependencies } from './evaluate_dependencies';

describe('evaluateDependencies', () => {
  const STARTED_AT = new Date('2023-01-01T00:00:00.000Z');
  const slo = createSLO({ groupBy: 'host.name' });
  const dependencyParams = createBurnRateRule(slo);
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let sloRepository: jest.Mocked<SLODefinitionRepository>;

  const runEvaluation = (
    dependencies: Dependency[] = [
      { ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] },
    ],
    projectRouting?: string
  ) =>
    evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      dependencies,
      STARTED_AT,
      projectRouting
    );

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
    sloRepository = createSLORepositoryMock();
    soClient.get.mockResolvedValue(
      createBurnRateRuleSavedObject('dependency-rule', dependencyParams)
    );
    sloRepository.findById.mockResolvedValue(slo);
    esClient.esql.query.mockResolvedValue(createEvaluationResponse([]));
  });

  it('evaluates the dependency rule SLO with only the windows to suppress on', async () => {
    esClient.esql.query.mockResolvedValueOnce(createEvaluationResponse([['host-a', 0, 7, 6.5]]));

    const { activeRules } = await runEvaluation([
      { ruleId: 'dependency-rule', actionGroupsToSuppressOn: [HIGH_PRIORITY_ACTION.id] },
    ]);

    expect(soClient.get).toHaveBeenCalledWith('alert', 'dependency-rule');
    expect(sloRepository.findById).toHaveBeenCalledWith(dependencyParams.sloId);
    const { query, params } = esClient.esql.query.mock.calls[0][0];
    expect(query).toContain('w0_short_burn_rate >= ?w0_threshold');
    expect(query).not.toContain('w1_');
    expect(params).toContainEqual({ w0_threshold: 6 });
    expect(activeRules).toEqual([
      {
        rule: expect.objectContaining({ id: 'dependency-rule' }),
        slo,
        instanceIdsToSuppress: ['host-a'],
        suppressAll: false,
      },
    ]);
  });

  it('suppresses all instances when the dependency only breaches for the ungrouped instance', async () => {
    esClient.esql.query.mockResolvedValueOnce(createEvaluationResponse([[ALL_VALUE, 0, 20, 15]]));

    const { activeRules } = await runEvaluation();

    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: true })
    );
  });

  it('suppresses nothing when the dependency is not breaching', async () => {
    const { activeRules } = await runEvaluation();

    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: false })
    );
  });

  it('does not query when no window of the dependency rule matches the action groups to suppress on', async () => {
    soClient.get.mockResolvedValueOnce(
      createBurnRateRuleSavedObject('dependency-rule', {
        ...dependencyParams,
        windows: [dependencyParams.windows[0]],
      })
    );

    const { activeRules } = await runEvaluation([
      { ruleId: 'dependency-rule', actionGroupsToSuppressOn: [MEDIUM_PRIORITY_ACTION.id] },
    ]);

    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: false })
    );
  });

  it('looks up every breaching instance up to the maximum evaluation results, without groupings', async () => {
    await runEvaluation();

    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(
      new RegExp(`\\| LIMIT ${MAX_EVALUATION_RESULTS}$`)
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('evaluates every dependency', async () => {
    const otherSlo = createSLO({ groupBy: 'service.name' });
    soClient.get
      .mockResolvedValueOnce(createBurnRateRuleSavedObject('dependency-rule', dependencyParams))
      .mockResolvedValueOnce(
        createBurnRateRuleSavedObject('other-rule', createBurnRateRule(otherSlo))
      );
    sloRepository.findById.mockImplementation(async (id) => (id === otherSlo.id ? otherSlo : slo));
    esClient.esql.query
      .mockResolvedValueOnce(createEvaluationResponse([['host-a', 0, 20, 15]]))
      .mockResolvedValueOnce(createEvaluationResponse([['service-a', 0, 20, 15]]));

    const { activeRules } = await runEvaluation([
      { ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] },
      { ruleId: 'other-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] },
    ]);

    expect(activeRules).toEqual([
      expect.objectContaining({ slo, instanceIdsToSuppress: ['host-a'] }),
      expect.objectContaining({ slo: otherSlo, instanceIdsToSuppress: ['service-a'] }),
    ]);
  });

  it('includes project_routing in the query when projectRouting is provided', async () => {
    await runEvaluation(undefined, '_alias:_origin');

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
  });
});
