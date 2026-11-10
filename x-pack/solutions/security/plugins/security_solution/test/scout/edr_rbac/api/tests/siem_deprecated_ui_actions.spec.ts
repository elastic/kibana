/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
  SECURITY_FEATURE_ID_V4,
  SECURITY_FEATURE_ID_V5,
} from '@kbn/security-solution-features/constants';
import type { ApiClientFixture } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';

/**
 * Deliberately pinned to the versions deprecated as of `SECURITY_FEATURE_ID_V5`. When a newer
 * version lands and these are repointed at it, this test fails until `SECURITY_FEATURE_ID_V5` is
 * added here and the comparison target is bumped. That failure is the intended signal to whoever
 * bumps the version, not a regression.
 */
const DEPRECATED_FEATURE_IDS = [
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
  SECURITY_FEATURE_ID_V4,
];

/**
 * Users holding the deprecated alerts read privilege could update alerts, a capability the current
 * feature version intentionally does not reproduce, so it is the one `ui:` action allowed to have
 * no `siemV5` counterpart.
 */
const CAPABILITIES_WITHOUT_CURRENT_COUNTERPART: string[] = [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE];

const GLOBAL_ARTIFACT_CAPABILITY = 'writeGlobalArtifacts';

/**
 * Privileges that legitimately grant no `ui:` action on either version, so a privilege dropping out
 * of the comparison altogether is distinguishable from one that was never in it.
 */
const PRIVILEGES_WITHOUT_UI_ACTIONS: string[] = [];

/**
 * The reverse direction has sanctioned widenings, all of which preserve reach a deprecated
 * privilege already had. Each is deliberately narrow: a capability is tolerated only on the exact
 * versions and privileges its mapping targets, and the ESS-only ones stay strict on serverless so
 * a genuine widening there is still caught.
 *
 * Global artifact management, on both deployments. Before `siemV3` gave it a sub-feature of its
 * own, each artifact privilege carried the capability directly — see `v1_features` and
 * `v2_features` `product_feature_config.ts`.
 */
const GLOBAL_ARTIFACT_FEATURE_IDS: string[] = [SECURITY_FEATURE_ID_V1, SECURITY_FEATURE_ID_V2];
const GLOBAL_ARTIFACT_PRIVILEGES: string[] = [
  'all',
  'blocklist_all',
  'endpoint_exceptions_all',
  'event_filters_all',
  'host_isolation_exceptions_all',
  'trusted_applications_all',
];

/**
 * On ESS only, `addGlobalArtifactManagementToMinimalAll` extends that same reach to `minimal_all`.
 */
const ESS_GLOBAL_ARTIFACT_PRIVILEGES: string[] = ['minimal_all'];

/**
 * Endpoint exceptions, on ESS only. ESS never shipped an Endpoint Exceptions sub-feature privilege
 * before `siemV4`; the capability lived in the top-level `read` and `all` and their `minimal_`
 * variants. `security_solution_ess` `product_features_extensions.ts` maps those privileges onto
 * the current sub-feature so the reach survives, leaving the deprecated side without a `ui:`
 * counterpart of its own. Serverless has the sub-feature and applies no such mapping.
 */
const ESS_ENDPOINT_EXCEPTION_FEATURE_IDS: string[] = [
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
];
const ESS_ENDPOINT_EXCEPTION_PRIVILEGES: Record<string, string[]> = {
  showEndpointExceptions: ['all', 'read', 'minimal_all', 'minimal_read'],
  crudEndpointExceptions: ['all', 'minimal_all'],
};

const isSanctionedWidening = (
  isServerless: boolean,
  featureId: string,
  privilegeId: string,
  capability: string
): boolean => {
  if (capability === GLOBAL_ARTIFACT_CAPABILITY) {
    if (!GLOBAL_ARTIFACT_FEATURE_IDS.includes(featureId)) {
      return false;
    }

    return (
      GLOBAL_ARTIFACT_PRIVILEGES.includes(privilegeId) ||
      (!isServerless && ESS_GLOBAL_ARTIFACT_PRIVILEGES.includes(privilegeId))
    );
  }

  if (isServerless) {
    return false;
  }

  return (
    ESS_ENDPOINT_EXCEPTION_FEATURE_IDS.includes(featureId) &&
    (ESS_ENDPOINT_EXCEPTION_PRIVILEGES[capability] ?? []).includes(privilegeId)
  );
};

type FeaturePrivileges = Record<string, Record<string, string[]>>;

const capabilitiesWithPrefix = (actions: string[], prefix: string): string[] =>
  actions
    .filter((action) => action.startsWith(prefix))
    .map((action) => action.slice(prefix.length));

interface Comparison {
  /** How many actions were inspected, so an empty result can be told from a vacuous one. */
  checked: number;
  /**
   * Privileges that carry no `ui:` action on either version. `checked` is a feature-wide total, so
   * it stays healthy even if one privilege loses both its namespaces at once — that privilege then
   * contributes nothing to `missing` or `unexpected` and the comparison silently skips it.
   */
  withoutUiActions: string[];
  missing: string[];
  unexpected: string[];
}

const compareAgainstCurrentVersion = (
  privileges: Record<string, string[]>,
  featureId: string,
  isServerless: boolean
): Comparison => {
  const deprecatedPrefix = `ui:${featureId}/`;
  const currentPrefix = `ui:${SECURITY_FEATURE_ID_V5}/`;
  const missing: string[] = [];
  const unexpected: string[] = [];
  const withoutUiActions: string[] = [];
  let checked = 0;

  for (const [privilegeId, actions] of Object.entries(privileges)) {
    const allDeprecated = capabilitiesWithPrefix(actions, deprecatedPrefix);
    const deprecated = allDeprecated.filter(
      (capability) => !CAPABILITIES_WITHOUT_CURRENT_COUNTERPART.includes(capability)
    );
    const current = capabilitiesWithPrefix(actions, currentPrefix);
    checked += deprecated.length + current.length;

    // Read before the counterpart filter, so a privilege whose only deprecated action is an
    // excused one does not read as having lost its namespace.
    if (allDeprecated.length === 0 && current.length === 0) {
      withoutUiActions.push(privilegeId);
    }

    for (const capability of deprecated) {
      if (!current.includes(capability)) {
        missing.push(
          `${featureId}.${privilegeId} grants ${deprecatedPrefix}${capability} but not ${currentPrefix}${capability}`
        );
      }
    }

    // A privilege granting a current action it never held on the deprecated version widens
    // what that version reaches, which the navigation specs asserted through the UI.
    for (const capability of current) {
      const isExpected =
        deprecated.includes(capability) ||
        isSanctionedWidening(isServerless, featureId, privilegeId, capability);

      if (!isExpected) {
        unexpected.push(
          `${featureId}.${privilegeId} grants ${currentPrefix}${capability} without a ${deprecatedPrefix} counterpart`
        );
      }
    }
  }

  return { checked, withoutUiActions, missing, unexpected };
};

const fetchFeaturePrivileges = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<FeaturePrivileges> => {
  const response = await apiClient.get('api/security/privileges?includeActions=true', {
    headers: { ...headers, 'kbn-xsrf': 'true', ...PUBLIC_API_HEADERS },
    responseType: 'json',
  });

  expect(response).toHaveStatusCode(200);

  return (response.body as { features: FeaturePrivileges }).features;
};

apiTest.describe(
  'deprecated `siem` versions map onto current `ui:` actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    for (const featureId of DEPRECATED_FEATURE_IDS) {
      apiTest(
        `maps ${featureId} ui: actions onto ${SECURITY_FEATURE_ID_V5} in both directions`,
        async ({ apiClient, requestAuth, config }) => {
          const { apiKeyHeader } = await requestAuth.getApiKey('admin');
          const features = await fetchFeaturePrivileges(apiClient, apiKeyHeader);
          const privileges = features[featureId];
          expect(privileges).toBeDefined();

          const { checked, withoutUiActions, missing, unexpected } = compareAgainstCurrentVersion(
            privileges,
            featureId,
            config.serverless
          );

          // Guards against the assertions passing because nothing was inspected, feature-wide and
          // then per privilege, since the feature-wide total hides a single privilege going empty.
          expect(checked).toBeGreaterThan(0);
          expect(withoutUiActions).toStrictEqual(PRIVILEGES_WITHOUT_UI_ACTIONS);
          expect(missing).toStrictEqual([]);
          expect(unexpected).toStrictEqual([]);
        }
      );
    }
  }
);
