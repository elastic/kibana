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
import {
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
} from '@kbn/security-solution-plugin/common/api/initialization';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';
import { deleteAllPrebuiltRuleAssets } from '../../../../utils/rules/prebuilt_rules/delete_all_prebuilt_rule_assets';
import { deleteAllTimelines } from '../../../../utils/rules/prebuilt_rules/delete_all_timelines';
import {
  deleteEndpointFleetPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils/rules/prebuilt_rules/delete_fleet_packages';
import { installPrebuiltRulesFleetPackage } from '../../../../utils/rules/prebuilt_rules/install_prebuilt_rules_fleet_package';
import { initializeSecuritySolution } from '../../../../utils/rules/prebuilt_rules/initialize_security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retryService = getService('retry');
  describe('@ess @serverless @skipInServerlessMKI Install prebuilt rules from EPR', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('bootstraps prebuilt rules by installing required packages from EPR', async () => {
      await retryService.tryWithRetries(
        'initializeSecuritySolution',
        async () => {
          await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
          await deleteEndpointFleetPackage({ supertest, es, log, retryService });

          const { body } = await initializeSecuritySolution(supertest, [
            INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
            INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
          ]).expect(200);

          const prebuiltRulesResult = body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES];
          const endpointResult = body.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION];

          expect(prebuiltRulesResult).toMatchObject({
            status: 'ready',
            payload: expect.objectContaining({
              name: PREBUILT_RULES_PACKAGE_NAME,
            }),
          });
          expect(endpointResult).toMatchObject({
            status: 'ready',
            payload: expect.objectContaining({
              name: ENDPOINT_PACKAGE_NAME,
            }),
          });
        },
        {
          retryCount: 10,
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
