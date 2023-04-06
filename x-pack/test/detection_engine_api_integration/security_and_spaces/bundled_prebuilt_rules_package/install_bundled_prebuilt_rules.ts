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
import { deletePrebuiltRulesFleetPackage } from '../../utils/prebuilt_rules/delete_prebuilt_rules_fleet_package';
import { BUNDLED_PACKAGE_DEST_DIR, BUNDLED_PACKAGE_SRC_DIR } from './config';
import {
  bundlePackage,
  removeBundledPackages,
} from '../../utils/prebuilt_rules/bundle_fleet_package';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('install_bundled_prebuilt_rules', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage(supertest);
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es);
      await deleteAllPrebuiltRuleAssets(es);
    });

    it('should install prebuilt rules from the package that comes bundled with Kibana', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusBeforePackageInstallation.rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_updated).toBe(0);

      await bundlePackage(
        'security_detection_engine_8.7.1',
        BUNDLED_PACKAGE_SRC_DIR,
        BUNDLED_PACKAGE_DEST_DIR
      );

      const bundledInstallResponse = await supertest
        .post(`/api/fleet/epm/packages/_bulk`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({ packages: ['security_detection_engine_8.7.1'], force: true })
        .expect(200);

      // As opposed to "registry"
      expect(bundledInstallResponse.body.items[0].result.installSource).toBe('bundled');

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterPackageInstallation.rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_installed).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);

      await removeBundledPackages(BUNDLED_PACKAGE_DEST_DIR);
    });
  });
};
