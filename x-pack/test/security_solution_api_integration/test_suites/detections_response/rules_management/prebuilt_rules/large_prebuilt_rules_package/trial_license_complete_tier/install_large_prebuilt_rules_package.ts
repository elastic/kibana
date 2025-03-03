/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getPrebuiltRulesAndTimelinesStatus,
  installPrebuiltRulesAndTimelines,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI install_large_prebuilt_rules_package', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('should install a package containing 15000 prebuilt rules without crashing', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(
        es,
        supertest
      );

      expect(statusBeforePackageInstallation).toMatchObject({
        rules_installed: 0,
        rules_not_installed: 0,
        rules_not_updated: 0,
      });

      // Install the package with 15000 prebuilt historical version of rules rules and 750 unique rules
      await installPrebuiltRulesAndTimelines(es, supertest);

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(
        es,
        supertest
      );

      expect(statusAfterPackageInstallation).toMatchObject({
        rules_installed: 750,
        rules_not_installed: 0,
        rules_not_updated: 0,
      });
    });
  });
};
