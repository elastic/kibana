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
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils/rules/prebuilt_rules/delete_fleet_packages';
import { deleteAllRules, waitFor } from '../../../../../../config/services/detections_response';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retryService = getService('retry');
  const detectionsApi = getService('detectionsApi');

  describe('@ess @serverless @skipInServerlessMKI Install from mocked prebuilt rule assets', () => {
    beforeEach(async () => {
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
      const { body: bootstrapPrebuiltRulesResponse } = await detectionsApi
        .bootstrapPrebuiltRules()
        .expect(200);

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

      const { body: reviewPrebuiltRulesForInstallationResponse } = await supertest
        .post(REVIEW_RULE_INSTALLATION_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send()
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
