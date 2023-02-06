/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREBUILT_RULES_STATUS_URL } from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteAllTimelines,
  deleteSignalsIndex,
  installPrePackagedRules,
  waitFor,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('add_prepackaged_rules', () => {
    describe('creating prepackaged rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);

        await deleteAllAlerts(supertest, log);
        await deleteAllTimelines(es);
      });

      it('should create the prepackaged rules and return a count greater than zero, rules_updated to be zero, and contain the correct keys', async () => {
        const response = await installPrePackagedRules(supertest, es, log);

        expect(response?.rules_installed).toBeGreaterThan(0);
        expect(response?.rules_updated).toBe(0);
        expect(response).toEqual(
          expect.objectContaining({
            rules_installed: expect.any(Number),
            rules_updated: expect.any(Number),
            timelines_installed: expect.any(Number),
            timelines_updated: expect.any(Number),
          })
        );
      });

      it('should be possible to call the API twice and the second time the number of rules installed should be zero as well as timeline', async () => {
        await installPrePackagedRules(supertest, es, log);

        // NOTE: I call the GET call until eventually it becomes consistent and that the number of rules to install are zero.
        // This is to reduce flakiness where it can for a short period of time try to install the same rule twice.
        await waitFor(
          async () => {
            const { body } = await supertest
              .get(PREBUILT_RULES_STATUS_URL)
              .set('kbn-xsrf', 'true')
              .expect(200);
            return body.rules_not_installed === 0;
          },
          PREBUILT_RULES_STATUS_URL,
          log
        );

        const response = await installPrePackagedRules(supertest, es, log);

        expect(response?.rules_installed).toBe(0);
        expect(response?.timelines_installed).toBe(0);
      });
    });
  });
};
