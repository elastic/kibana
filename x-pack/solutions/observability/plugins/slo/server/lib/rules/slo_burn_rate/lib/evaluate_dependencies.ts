/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Rule } from '@kbn/alerting-plugin/common';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { Dependency } from '../../../../../common/burn_rate_rule/types';
import type { SLODefinitionRepository } from '../../../../services';
import type { BurnRateRuleParams } from '../types';
import type { SLODefinition } from '../../../../domain/models';
import { evaluate } from './evaluate';

export interface ActiveRule {
  rule: Rule<BurnRateRuleParams>;
  slo: SLODefinition;
  instanceIdsToSuppress: string[];
  suppressAll: boolean;
}

export interface EvaulateDependenciesResponse {
  activeRules: ActiveRule[];
}

export async function evaluateDependencies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  sloRepository: SLODefinitionRepository,
  dependencies: Dependency[],
  startedAt: Date
): Promise<EvaulateDependenciesResponse> {
  const activeRules = await Promise.all(
    dependencies.map(async (dependency) => {
      const rule = await fetchRule(soClient, dependency.ruleId);
      const slo = await sloRepository.findById(rule.params.sloId);
      const paramsWithSuppressOnWindows = {
        ...rule.params,
        windows: rule.params.windows.filter((winDef) =>
          dependency.actionGroupsToSuppressOn.includes(winDef.actionGroup)
        ),
      };
      const results = await evaluate(esClient, slo, paramsWithSuppressOnWindows, startedAt);
      const instanceIdsToSuppress = results
        .filter((res) => res.shouldAlert)
        .map((res) => res.instanceId);
      const suppressAll =
        instanceIdsToSuppress.length > 0 && instanceIdsToSuppress.every((id) => id === ALL_VALUE);
      return {
        rule,
        slo,
        instanceIdsToSuppress: suppressAll ? [] : instanceIdsToSuppress,
        suppressAll,
      };
    })
  );
  return { activeRules };
}

async function fetchRule(soClient: SavedObjectsClientContract, ruleId: string) {
  const response = await soClient.get<Rule<BurnRateRuleParams>>('alert', ruleId);
  return response.attributes;
}
