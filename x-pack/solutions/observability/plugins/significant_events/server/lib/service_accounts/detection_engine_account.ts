/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CoreSetup, CoreStart, KibanaRequest } from '@kbn/core/server';
import type { GetScopedClients } from '../../routes/types';
import { runRulesInBatches } from '../maintenance/rules';

/**
 * What the detection engine does outside a workflow run, such as turning its rules on, runs as the
 * service account bound to this workload in the space. A user only starts those actions.
 */
export const DETECTION_ENGINE_WORKLOAD_TYPE = 'detection_engine';
/** One binding per space: the binding carries the space. */
export const DETECTION_ENGINE_WORKLOAD_ID = 'detection_engine';

export const registerDetectionEngineWorkloadType = (core: CoreSetup): void => {
  core.security.serviceAccounts.registerWorkloadType({
    type: DETECTION_ENGINE_WORKLOAD_TYPE,
    name: 'Nightshift detection engine',
    description:
      'Changes the Nightshift detection engine makes outside workflow runs, such as turning its rules on.',
  });
};

/** Runs `fn` with a request authenticated as the account bound to the space's detection engine. */
export const withDetectionEngineAccount = <T>({
  core,
  spaceId,
  fn,
}: {
  core: CoreStart;
  spaceId: string;
  fn: (accountRequest: KibanaRequest) => Promise<T>;
}): Promise<T> =>
  core.security.serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
      spaceId,
      executionId: uuidv4(),
    },
    fn
  );

/**
 * Turns the space's enabled rule-backed rules off and on again as the account, so their executor
 * tasks run on keys the account owns. Alerting only replaces a rule's key when the rule is enabled
 * again; disabled rules are left as they are.
 */
export const reassignRulesToAccount = ({
  core,
  spaceId,
  getScopedClients,
}: {
  core: CoreStart;
  spaceId: string;
  getScopedClients: GetScopedClients;
}): Promise<{ reassigned: number; failedIds: string[] }> =>
  withDetectionEngineAccount({
    core,
    spaceId,
    fn: async (accountRequest) => {
      const { getSignificantEventsAlertingContext, getKnowledgeIndicatorClient } =
        await getScopedClients({ request: accountRequest });
      const [{ rulesClient, alertingV2RulesClient }, kiClient] = await Promise.all([
        getSignificantEventsAlertingContext(),
        getKnowledgeIndicatorClient(),
      ]);
      const links = await kiClient.getRuleBackedQueryLinks();
      const ruleIds = [...new Set(links.map(({ rule_id: ruleId }) => ruleId))];
      const enabledStates = await rulesClient.findRuleEnabledStates(ruleIds);
      const enabledIds = ruleIds.filter((id) => enabledStates.get(id) === true);

      const disabled = await runRulesInBatches(enabledIds, (ids) =>
        alertingV2RulesClient.bulkDisableRules({ ids })
      );
      const enabled = await runRulesInBatches(disabled.toggledIds, (ids) =>
        alertingV2RulesClient.bulkEnableRules({ ids })
      );
      return {
        reassigned: enabled.toggledIds.length,
        failedIds: [...disabled.failedIds, ...enabled.failedIds],
      };
    },
  });
