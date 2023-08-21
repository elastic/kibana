/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, deleteAllRules } from '../../utils';
import { getInstalledRules } from '../../utils/prebuilt_rules/get_installed_rules';
import { getPrebuiltRulesStatus } from '../../utils/prebuilt_rules/get_prebuilt_rules_status';
import { installPrebuiltRules } from '../../utils/prebuilt_rules/install_prebuilt_rules';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /* This test makes use of the mock packages created in the '/fleet_bundled_packages' folder,
  /* in order to assert that, in production environments, the latest stable version of the package
  /* is installed, and that prerelease packages are ignored.
  /* The mock packages to test are 99.0.0 and 99.0.1-beta.1, where the latter is a prerelease package.
  /* (We use high mock version numbers to prevent clashes with real packages downloaded in other tests.)
  /* To do assertions on which packages have been installed, 99.0.0 has a single rule to install,
  /* while 99.0.1-beta.1 has 2 rules to install. Also, both packages have the version as part of the rule names. */
  describe('prerelease_packages', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es);
    });

    it('should install latest stable version and ignore prerelease packages', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesStatus(supertest);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_install).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);

      await installPrebuiltRules(es, supertest);

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesStatus(supertest);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_installed).toBe(1); // 1 rule in package 99.0.0
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_install).toBe(0);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);

      // Get installed rules
      const rulesResponse = await getInstalledRules(supertest);

      // Assert that installed rules are from package 99.0.0 and not from prerelease (beta) package
      expect(rulesResponse.data.length).toBe(1);
      expect(rulesResponse.data[0].name).not.toContain('beta');
      expect(rulesResponse.data[0].name).toContain('99.0.0');
    });
  });
};
