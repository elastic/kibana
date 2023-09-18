/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllRules, getPrebuiltRulesAndTimelinesStatus } from '../../utils';
import { deleteAllPrebuiltRuleAssets } from '../../utils/prebuilt_rules/delete_all_prebuilt_rule_assets';
import { installPrebuiltRulesAndTimelines } from '../../utils/prebuilt_rules/install_prebuilt_rules_and_timelines';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('install_large_prebuilt_rules_package', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es);
    });

    it('should install a package containing 15000 prebuilt rules without crashing', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusBeforePackageInstallation.rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_updated).toBe(0);

      // Install the package with 15000 prebuilt historical version of rules rules and 750 unique rules
      await installPrebuiltRulesAndTimelines(es, supertest);

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterPackageInstallation.rules_installed).toBe(750);
      expect(statusAfterPackageInstallation.rules_not_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);
    });
  });
};
