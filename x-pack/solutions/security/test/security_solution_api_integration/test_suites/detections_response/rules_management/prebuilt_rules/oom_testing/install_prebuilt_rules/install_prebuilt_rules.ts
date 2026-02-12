/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import {
  GET_PREBUILT_RULES_STATUS_URL,
  PERFORM_RULE_INSTALLATION_URL,
  REVIEW_RULE_INSTALLATION_URL,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules, waitFor } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils/rules/prebuilt_rules/delete_fleet_packages';

const KIBANA_STATUS_URL = '/api/status';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retryService = getService('retry');
  const detectionsApi = getService('detectionsApi');

  describe('@ess @serverless @skipInServerlessMKI Install from mocked prebuilt rule assets', () => {
    beforeEach(async () => {
      await waitFor(
        async () => {
          const { body: kibanaStatusResponse } = await supertest
            .get(KIBANA_STATUS_URL)
            .send()
            .expect(200);

          if (kibanaStatusResponse.status.plugins.fleet.summary === 'Fleet setup failed') {
            throw new Error(
              `Fleet setup failed: ${JSON.stringify(
                kibanaStatusResponse.status.plugins.fleet,
                null,
                2
              )}`
            );
          }

          return kibanaStatusResponse.status.plugins.fleet.summary === 'Fleet is available';
        },
        'waitForFleetSetup',
        log,
        undefined, // maxTimeout - use default
        3000 // timeoutWait - wait longer between tries as fleet setup can take some time
      );

      await deleteAllRules(supertest, log);

      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteEndpointFleetPackage({ supertest, es, log, retryService });

      await waitFor(
        async () => {
          const { body: prebuiltRulesStatus } = await supertest
            .get(GET_PREBUILT_RULES_STATUS_URL)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200);

          return (
            prebuiltRulesStatus.stats.num_prebuilt_rules_installed === 0 &&
            prebuiltRulesStatus.stats.num_prebuilt_rules_to_install === 0
          );
        },
        'waitForIndexesRefreshAfterPackagesDeletion',
        log
      );
    });

    it('install prebuilt rules from a package', async () => {
      const { statusCode: bootstrapPrebuiltRulesStatusCode, body: bootstrapPrebuiltRulesResponse } =
        await detectionsApi.bootstrapPrebuiltRules();

      // Assert body first to be able to see error messages in case of failure
      expect(bootstrapPrebuiltRulesResponse).toMatchObject({
        packages: expect.arrayContaining([
          expect.objectContaining({
            name: PREBUILT_RULES_PACKAGE_NAME,
          }),
          expect.objectContaining({
            name: ENDPOINT_PACKAGE_NAME,
          }),
        ]),
      });
      expect(bootstrapPrebuiltRulesStatusCode).toBe(200);

      const { body: reviewPrebuiltRulesForInstallationResponse } = await supertest
        .post(REVIEW_RULE_INSTALLATION_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          page: 1,
          per_page: 10_000,
        })
        .expect(200);

      expect(reviewPrebuiltRulesForInstallationResponse.rules.length).toBeGreaterThan(0);

      const { body: installPrebuiltRulesResponse } = await supertest
        .post(PERFORM_RULE_INSTALLATION_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({ mode: 'ALL_RULES' })
        .expect(200);

      expect(installPrebuiltRulesResponse.summary.succeeded).toBeGreaterThan(0);
    });
  });
};
