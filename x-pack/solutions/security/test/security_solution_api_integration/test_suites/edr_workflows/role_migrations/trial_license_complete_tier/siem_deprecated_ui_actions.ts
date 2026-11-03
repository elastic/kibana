/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
  SECURITY_FEATURE_ID_V4,
  SECURITY_FEATURE_ID_V5,
} from '@kbn/security-solution-features/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

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
 * The reverse direction has two sanctioned widenings, both of which exist to preserve what a
 * deprecated privilege already reached. Each is deliberately narrow: a capability is tolerated
 * only on the exact versions and privileges the mapping targets.
 *
 * Global artifact management. Before `siemV3` gave it a sub-feature of its own, each artifact
 * privilege carried the capability directly (`v1_features` and `v2_features`
 * `product_feature_config.ts`), and on ESS `addGlobalArtifactManagementToMinimalAll` extends the
 * same reach to `minimal_all`.
 */
const GLOBAL_ARTIFACT_FEATURE_IDS: string[] = [SECURITY_FEATURE_ID_V1, SECURITY_FEATURE_ID_V2];
const GLOBAL_ARTIFACT_PRIVILEGES: string[] = [
  'all',
  'minimal_all',
  'blocklist_all',
  'endpoint_exceptions_all',
  'event_filters_all',
  'host_isolation_exceptions_all',
  'trusted_applications_all',
];

/**
 * Endpoint exceptions. ESS never shipped an Endpoint Exceptions sub-feature privilege before
 * `siemV4`; the capability lived in the top-level `read` and `all` and their `minimal_` variants.
 * `security_solution_ess` `product_features_extensions.ts` maps those privileges onto the current
 * sub-feature so the reach survives, leaving the deprecated side without a `ui:` counterpart of
 * its own. Serverless has the sub-feature, so these entries never match there.
 */
const ENDPOINT_EXCEPTION_FEATURE_IDS: string[] = [
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
];
const ENDPOINT_EXCEPTION_PRIVILEGES: Record<string, string[]> = {
  showEndpointExceptions: ['all', 'read', 'minimal_all', 'minimal_read'],
  crudEndpointExceptions: ['all', 'minimal_all'],
};

const isSanctionedWidening = (
  featureId: string,
  privilegeId: string,
  capability: string
): boolean => {
  if (capability === GLOBAL_ARTIFACT_CAPABILITY) {
    return (
      GLOBAL_ARTIFACT_FEATURE_IDS.includes(featureId) &&
      GLOBAL_ARTIFACT_PRIVILEGES.includes(privilegeId)
    );
  }

  return (
    ENDPOINT_EXCEPTION_FEATURE_IDS.includes(featureId) &&
    (ENDPOINT_EXCEPTION_PRIVILEGES[capability] ?? []).includes(privilegeId)
  );
};

type FeaturePrivileges = Record<string, Record<string, string[]>>;

const capabilitiesWithPrefix = (actions: string[], prefix: string): string[] =>
  actions
    .filter((action) => action.startsWith(prefix))
    .map((action) => action.slice(prefix.length));

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('@ess @serverless @skipInServerlessMKI deprecated `siem` versions map onto current `ui:` actions', () => {
    let features: FeaturePrivileges;

    before(async () => {
      const { body } = await supertest
        .get('/api/security/privileges')
        .query({ includeActions: 'true' })
        .set('kbn-xsrf', 'true')
        .expect(200);

      features = body.features as FeaturePrivileges;
    });

    for (const featureId of DEPRECATED_FEATURE_IDS) {
      it(`maps ${featureId} ui: actions onto ${SECURITY_FEATURE_ID_V5} in both directions`, () => {
        const privileges = features[featureId];
        expect(privileges).to.be.an('object');

        const deprecatedPrefix = `ui:${featureId}/`;
        const currentPrefix = `ui:${SECURITY_FEATURE_ID_V5}/`;
        const missing: string[] = [];
        const unexpected: string[] = [];
        let checked = 0;

        for (const [privilegeId, actions] of Object.entries(privileges)) {
          const deprecated = capabilitiesWithPrefix(actions, deprecatedPrefix).filter(
            (capability) => !CAPABILITIES_WITHOUT_CURRENT_COUNTERPART.includes(capability)
          );
          const current = capabilitiesWithPrefix(actions, currentPrefix);
          checked += deprecated.length + current.length;

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
            if (
              deprecated.includes(capability) ||
              isSanctionedWidening(featureId, privilegeId, capability)
            ) {
              continue;
            }

            unexpected.push(
              `${featureId}.${privilegeId} grants ${currentPrefix}${capability} without a ${deprecatedPrefix} counterpart`
            );
          }
        }

        // Guards against the assertion passing because nothing was inspected.
        expect(checked).to.be.greaterThan(0);
        expect(missing).to.eql([]);
        expect(unexpected).to.eql([]);
      });
    }
  });
}
