/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs/promises';
import path from 'path';

import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  deleteAllRules,
  getPrebuiltRulesAndTimelinesStatus,
} from '../../utils';
import { BUNDLED_PACKAGE_DIR } from './config';
import { downloadPackageFromFleet } from '../../utils/prebuilt_rules/download_prebuilt_rules_from_epr';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const removeBundledPackages = async (bundledFleetPackageDir: string) => {
    const files = await fs.readdir(bundledFleetPackageDir);

    // Do not remove mock packages with version 99.0.0 and 99.0.1
    // which are used to test the installation of prerelease packages
    const downloadedFiles = files.filter((file) => !file.includes('99')) || [];

    for (const file of downloadedFiles) {
      await fs.unlink(path.join(bundledFleetPackageDir, file));
    }
  };

  /* This test simulates an air-gapped environment in which the user doesn't have access to EPR.
  /* We first download the package from the registry as done during build time, and then
  /* attempt to install it from the local file system. The API response from EPM provides
  /* us with the information of whether the package was installed from the registry or
  /* from a package that was bundled with Kibana */
  describe('install_bundled_prebuilt_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es);
    });

    afterEach(async () => {
      await removeBundledPackages(BUNDLED_PACKAGE_DIR);
    });

    it('should install prebuilt rules from the package that comes bundled with Kibana', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusBeforePackageInstallation.rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_installed).toBe(0);
      expect(statusBeforePackageInstallation.rules_not_updated).toBe(0);

      // Download the package from the registry as done during build time,
      // according to the fleet packages configured in fleet_packages.json file
      const { version } = await downloadPackageFromFleet(BUNDLED_PACKAGE_DIR, log);

      const EPM_URL = `/api/fleet/epm/packages/security_detection_engine/${version}`;

      const bundledInstallResponse = await supertest
        .post(EPM_URL)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({ force: true })
        .expect(200);

      // As opposed to "registry"
      expect(bundledInstallResponse.body._meta.install_source).toBe('bundled');

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesAndTimelinesStatus(supertest);
      expect(statusAfterPackageInstallation.rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.rules_not_installed).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.rules_not_updated).toBe(0);
    });
  });
};
