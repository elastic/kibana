/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import { deleteAllPrebuiltRuleAssets } from '../../../../utils/rules/prebuilt_rules/delete_all_prebuilt_rule_assets';
import { deleteAllTimelines } from '../../../../utils/rules/prebuilt_rules/delete_all_timelines';
import {
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils/rules/prebuilt_rules/delete_fleet_packages';
import { installPrebuiltRulesFleetPackage } from '../../../../utils/rules/prebuilt_rules/install_prebuilt_rules_fleet_package';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retryService = getService('retry');
  const detectionsApi = getService('detectionsApi');

  describe('@ess @serverless @skipInServerlessMKI Install prebuilt rules from EPR', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('bootstraps prebuilt rules by installing required packages from EPR', async () => {
      await retryService.tryWithRetries(
        'bootstrapPrebuiltRules',
        async () => {
          await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
          await deleteEndpointFleetPackage({ supertest, es, log, retryService });

          const { body } = await detectionsApi.bootstrapPrebuiltRules().expect(200);

          expect(body).toMatchObject({
            packages: expect.arrayContaining([
              expect.objectContaining({
                name: PREBUILT_RULES_PACKAGE_NAME,
                status: 'installed',
              }),
              expect.objectContaining({
                name: ENDPOINT_PACKAGE_NAME,
                status: 'installed',
              }),
            ]),
          });
        },
        {
          retryCount: 10, // 10s delay * 120 reties = 20 mins
          retryDelay: 5000,
          timeout: 60000 * 10, // total timeout applied to all attempts altogether, 10 mins
        }
      );
    });

    /**
     * Unlike other tests that use mocks, this test uses actual rules from the
     * package storage and checks that they are installed.
     */
    it('should install prebuilt rules from the package storage', async () => {
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteEndpointFleetPackage({ supertest, es, log, retryService });

      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(
        es,
        supertest
      );
      expect(statusBeforePackageInstallation.rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_updated).toBe(0);

      await installPrebuiltRulesFleetPackage({
        es,
        supertest,
        overrideExistingPackage: true,
        retryService,
      });

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(
        es,
        supertest
      );
      expect(statusAfterPackageInstallation.rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_installed).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);

      // Verify that all previously not installed rules were installed
      const response = await installPrebuiltRulesAndTimelines(es, supertest);
      expect(response.rules_installed).toBe(statusAfterPackageInstallation.rules_not_installed);
      expect(response.rules_updated).toBe(0);

      // Verify that status is updated after rules installation
      const statusAfterRuleInstallation = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
      expect(statusAfterRuleInstallation.rules_installed).toBe(response.rules_installed);
      expect(statusAfterRuleInstallation.rules_not_installed).toBe(0);
      expect(statusAfterRuleInstallation.rules_not_updated).toBe(0);
    });
  });
};
