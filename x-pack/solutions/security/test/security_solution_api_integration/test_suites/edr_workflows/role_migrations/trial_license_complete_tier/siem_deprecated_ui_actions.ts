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

type FeaturePrivileges = Record<string, Record<string, string[]>>;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('@ess @serverless @skipInServerlessMKI deprecated `siem` versions grant current `ui:` actions', () => {
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
      it(`grants the ${SECURITY_FEATURE_ID_V5} action wherever ${featureId} grants a ui: action`, () => {
        const privileges = features[featureId];
        expect(privileges).to.be.an('object');

        const prefix = `ui:${featureId}/`;
        const missing: string[] = [];
        let checked = 0;

        for (const [privilegeId, actions] of Object.entries(privileges)) {
          for (const action of actions) {
            if (!action.startsWith(prefix)) {
              continue;
            }

            const capability = action.slice(prefix.length);
            if (CAPABILITIES_WITHOUT_CURRENT_COUNTERPART.includes(capability)) {
              continue;
            }

            checked++;
            const currentAction = `ui:${SECURITY_FEATURE_ID_V5}/${capability}`;
            if (!actions.includes(currentAction)) {
              missing.push(`${featureId}.${privilegeId} grants ${action} but not ${currentAction}`);
            }
          }
        }

        // Guards against the assertion passing because nothing was inspected.
        expect(checked).to.be.greaterThan(0);
        expect(missing).to.eql([]);
      });
    }
  });
}
