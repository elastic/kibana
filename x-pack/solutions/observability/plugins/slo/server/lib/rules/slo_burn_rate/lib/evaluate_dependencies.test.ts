/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../../../common/constants';
import type { SLODefinition } from '../../../../domain/models';
import type { SLODefinitionRepository } from '../../../../services';
import { createSLO } from '../../../../services/fixtures/slo';
import { createSLORepositoryMock } from '../../../../services/mocks';
import { MAX_EVALUATION_RESULTS } from '../constants';
import { createBurnRateRule } from '../fixtures/rule';
import type { BurnRateRuleParams } from '../types';
import { evaluateDependencies } from './evaluate_dependencies';

const esqlResponse = (
  values: Array<[string, number, number, number]>
): estypes.EsqlQueryResponse => ({
  columns: [
    { name: 'instance_id', type: 'keyword' },
    { name: 'window_index', type: 'integer' },
    { name: 'short_window_burn_rate', type: 'double' },
    { name: 'long_window_burn_rate', type: 'double' },
  ],
  values,
});

const ruleResponse = (
  ruleId: string,
  params: BurnRateRuleParams
): SavedObject<Rule<BurnRateRuleParams>> => ({
  id: ruleId,
  type: 'alert',
  references: [],
  attributes: { id: ruleId, params } as Rule<BurnRateRuleParams>,
});

describe('evaluateDependencies', () => {
  const STARTED_AT = new Date('2023-01-01T00:00:00.000Z');
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let sloRepository: jest.Mocked<SLODefinitionRepository>;
  let slo: SLODefinition;
  let dependencyParams: BurnRateRuleParams;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
    sloRepository = createSLORepositoryMock();
    slo = createSLO({ groupBy: 'host.name' });
    dependencyParams = createBurnRateRule(slo);
    soClient.get.mockResolvedValue(ruleResponse('dependency-rule', dependencyParams));
    sloRepository.findById.mockResolvedValue(slo);
    esClient.esql.query.mockResolvedValue(esqlResponse([]));
  });

  it('evaluates the dependency rule SLO with only the windows to suppress on', async () => {
    esClient.esql.query.mockResolvedValueOnce(esqlResponse([['host-a', 0, 7, 6.5]]));

    const { activeRules } = await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [HIGH_PRIORITY_ACTION.id] }],
      STARTED_AT
    );

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
    esClient.esql.query.mockResolvedValueOnce(esqlResponse([[ALL_VALUE, 0, 20, 15]]));

    const { activeRules } = await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] }],
      STARTED_AT
    );

    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: true })
    );
  });

  it('suppresses nothing when the dependency is not breaching', async () => {
    const { activeRules } = await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] }],
      STARTED_AT
    );

    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: false })
    );
  });

  it('does not query when no window of the dependency rule matches the action groups to suppress on', async () => {
    soClient.get.mockResolvedValueOnce(
      ruleResponse('dependency-rule', {
        ...dependencyParams,
        windows: [dependencyParams.windows[0]],
      })
    );

    const { activeRules } = await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [MEDIUM_PRIORITY_ACTION.id] }],
      STARTED_AT
    );

    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(activeRules[0]).toEqual(
      expect.objectContaining({ instanceIdsToSuppress: [], suppressAll: false })
    );
  });

  it('looks up every breaching instance up to the maximum evaluation results, without groupings', async () => {
    await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] }],
      STARTED_AT
    );

    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(
      new RegExp(`\\| LIMIT ${MAX_EVALUATION_RESULTS}$`)
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('evaluates every dependency', async () => {
    const otherSlo = createSLO({ groupBy: 'service.name' });
    soClient.get
      .mockResolvedValueOnce(ruleResponse('dependency-rule', dependencyParams))
      .mockResolvedValueOnce(ruleResponse('other-rule', createBurnRateRule(otherSlo)));
    sloRepository.findById.mockImplementation(async (id) => (id === otherSlo.id ? otherSlo : slo));
    esClient.esql.query
      .mockResolvedValueOnce(esqlResponse([['host-a', 0, 20, 15]]))
      .mockResolvedValueOnce(esqlResponse([['service-a', 0, 20, 15]]));

    const { activeRules } = await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [
        { ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] },
        { ruleId: 'other-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] },
      ],
      STARTED_AT
    );

    expect(activeRules).toEqual([
      expect.objectContaining({ slo, instanceIdsToSuppress: ['host-a'] }),
      expect.objectContaining({ slo: otherSlo, instanceIdsToSuppress: ['service-a'] }),
    ]);
  });

  it('includes project_routing in the query when projectRouting is provided', async () => {
    await evaluateDependencies(
      soClient,
      esClient,
      sloRepository,
      [{ ruleId: 'dependency-rule', actionGroupsToSuppressOn: [ALERT_ACTION.id] }],
      STARTED_AT,
      '_alias:_origin'
    );

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
  });
});
