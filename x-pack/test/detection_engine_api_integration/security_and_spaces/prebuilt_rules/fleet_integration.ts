/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
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
        supertest,
        overrideExistingPackage: true,
      });

      // Before we proceed, we need to refresh saved object indices. This comment will explain why.
      // At the previous step we installed the Fleet package with prebuilt detection rules.
      // Prebuilt rules are assets that Fleet indexes as saved objects of a certain type.
      // Fleet does this via a savedObjectsClient.import() call with explicit `refresh: false`.
      // So, despite of the fact that the endpoint waits until the prebuilt rule assets will be
      // successfully indexed, it doesn't wait until they become "visible" for subsequent read
      // operations. Which is what we do next: we read these SOs in getPrebuiltRulesAndTimelinesStatus().
      // Now, the time left until the next refresh can be anything from 0 to the default value, and
      // it depends on the time when savedObjectsClient.import() call happens relative to the time of
      // the next refresh. Also, probably the refresh time can be delayed when ES is under load?
      // Anyway, here we have a race condition between a write and subsequent read operation, and to
      // fix it deterministically we have to refresh saved object indices and wait until it's done.
      await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterPackageInstallation.rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_installed).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);

      // Verify that all previously not installed rules were installed
      const response = await installPrebuiltRulesAndTimelines(supertest);
      expect(response.rules_installed).toBe(statusAfterPackageInstallation.rules_not_installed);
      expect(response.rules_updated).toBe(0);

      // Similar to the previous refresh, we need to do it again between the two operations:
      // - previous write operation: install prebuilt rules and timelines
      // - subsequent read operation: get prebuilt rules and timelines status
      // You may ask why? I'm not sure, probably because the write operation can install the Fleet
      // package under certain circumstances, and it all works with `refresh: false` again.
      // Anyway, there were flaky runs failing specifically at one of the next assertions,
      // which means some kind of the same race condition we have here too.
      await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

      // Verify that status is updated after rules installation
      const statusAfterRuleInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterRuleInstallation.rules_installed).toBe(response.rules_installed);
      expect(statusAfterRuleInstallation.rules_not_installed).toBe(0);
      expect(statusAfterRuleInstallation.rules_not_updated).toBe(0);
    });
  });
};
