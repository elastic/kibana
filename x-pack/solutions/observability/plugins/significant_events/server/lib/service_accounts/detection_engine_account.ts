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
import { StatusError } from '../errors/status_error';

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

/** The refusal for detection engine work in a space that is not set up to run as its accounts. */
export const createNotSetUpError = (): StatusError =>
  new StatusError('Nightshift is not set up in this space', 503);

/** The id of the account the space's detection engine runs as, or `undefined` when not set up. */
export const getDetectionEngineAccountId = async ({
  core,
  spaceId,
}: {
  core: CoreStart;
  spaceId: string;
}): Promise<string | undefined> => {
  if (!core.security.serviceAccounts.isEnabled()) {
    return undefined;
  }
  const binding = await core.security.serviceAccounts.getWorkloadBinding({
    workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
    workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    spaceId,
  });
  return binding?.serviceAccountId;
};

/** The id of the account the space's detection engine runs as, refused when not set up. */
export const requireDetectionEngineAccountId = async ({
  core,
  spaceId,
}: {
  core: CoreStart;
  spaceId: string;
}): Promise<string> => {
  const accountId = await getDetectionEngineAccountId({ core, spaceId });
  if (accountId === undefined) {
    throw createNotSetUpError();
  }
  return accountId;
};

/** Whether the space's detection engine has an account to run as. */
export const isDetectionEngineSetUp = async ({
  core,
  spaceId,
}: {
  core: CoreStart;
  spaceId: string;
}): Promise<boolean> => (await getDetectionEngineAccountId({ core, spaceId })) !== undefined;

/**
 * Runs `fn` with a request authenticated as the account bound to the space's detection engine.
 * With `expectedAccountId`, refuses when the space was rebound to another account in between.
 */
export const withDetectionEngineAccount = <T>({
  core,
  spaceId,
  expectedAccountId,
  fn,
}: {
  core: CoreStart;
  spaceId: string;
  expectedAccountId?: string;
  fn: (accountRequest: KibanaRequest) => Promise<T>;
}): Promise<T> =>
  core.security.serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
      spaceId,
      expectedServiceAccountId: expectedAccountId,
      executionId: uuidv4(),
    },
    fn
  );

/**
 * Runs `fn` as the space's account, refused when the space is not set up. A user's request is
 * swapped for one authenticated as the account. A service account's request is used as it is when
 * it is the space's account, such as a bound workflow run calling back into Kibana, and refused
 * otherwise: only that account may act for the detection engine.
 */
export const asDetectionEngineAccount = async <T>({
  core,
  request,
  spaceId,
  fn,
}: {
  core: CoreStart;
  request: KibanaRequest;
  spaceId: string;
  fn: (accountRequest: KibanaRequest) => Promise<T>;
}): Promise<T> => {
  const accountId = await getDetectionEngineAccountId({ core, spaceId });
  if (accountId === undefined) {
    throw createNotSetUpError();
  }
  const principal = core.security.authc.getPrincipal(request);
  if (principal?.type !== 'service_account') {
    return withDetectionEngineAccount({ core, spaceId, expectedAccountId: accountId, fn });
  }
  if (principal.serviceAccountId !== accountId) {
    throw new StatusError(
      `Service account [${principal.serviceAccountId}] is not the detection engine account of this space`,
      403
    );
  }
  return fn(request);
};

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
