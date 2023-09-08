/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteAllRules,
  deleteAllTimelines,
  getPrebuiltRulesAndTimelinesStatus,
} from '../../utils';
import { deleteAllPrebuiltRuleAssets } from '../../utils/prebuilt_rules/delete_all_prebuilt_rule_assets';
import { installPrebuiltRulesFleetPackage } from '../../utils/prebuilt_rules/install_prebuilt_rules_fleet_package';
import { installPrebuiltRulesAndTimelines } from '../../utils/prebuilt_rules/install_prebuilt_rules_and_timelines';
import { deletePrebuiltRulesFleetPackage } from '../../utils/prebuilt_rules/delete_prebuilt_rules_fleet_package';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('install_prebuilt_rules_from_real_package', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage(supertest);
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es);
      await deleteAllPrebuiltRuleAssets(es);
    });

    /**
     * Unlike other tests that use mocks, this test uses actual rules from the
     * package storage and checks that they are installed.
     */
    it('should install prebuilt rules from the package storage', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusBeforePackageInstallation.rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_updated).toBe(0);

      await installPrebuiltRulesFleetPackage({
        es,
        supertest,
        overrideExistingPackage: true,
      });

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterPackageInstallation.rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_installed).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);

      // Verify that all previously not installed rules were installed
      const response = await installPrebuiltRulesAndTimelines(es, supertest);
      expect(response.rules_installed).toBe(statusAfterPackageInstallation.rules_not_installed);
      expect(response.rules_updated).toBe(0);

      // Verify that status is updated after rules installation
      const statusAfterRuleInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterRuleInstallation.rules_installed).toBe(response.rules_installed);
      expect(statusAfterRuleInstallation.rules_not_installed).toBe(0);
      expect(statusAfterRuleInstallation.rules_not_updated).toBe(0);
    });
  });
};
