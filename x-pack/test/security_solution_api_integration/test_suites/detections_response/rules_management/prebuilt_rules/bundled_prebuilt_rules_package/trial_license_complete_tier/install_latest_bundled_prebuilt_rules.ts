/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs/promises';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import JSON5 from 'json5';
import expect from 'expect';
import { PackageSpecManifest } from '@kbn/fleet-plugin/common';
import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getPrebuiltRulesStatus,
  installPrebuiltRulesPackageByVersion,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  /* This test simulates an air-gapped environment in which the user doesn't have access to EPR.
  /* We first download the package from the registry as done during build time, and then
  /* attempt to install it from the local file system. The API response from EPM provides
  /* us with the information of whether the package was installed from the registry or
  /* from a package that was bundled with Kibana */
  //
  // FLAKY: https://github.com/elastic/kibana/issues/180087
  describe.skip('@ess @serverless @skipInServerlessMKI install_bundled_prebuilt_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('should list `security_detection_engine` as a bundled fleet package in the `fleet_package.json` file', async () => {
      const configFilePath = path.resolve(REPO_ROOT, 'fleet_packages.json');
      const fleetPackages = await fs.readFile(configFilePath, 'utf8');

      const parsedFleetPackages: PackageSpecManifest[] = JSON5.parse(fleetPackages);

      const securityDetectionEnginePackage = parsedFleetPackages.find(
        (fleetPackage) => fleetPackage.name === 'security_detection_engine'
      );

      expect(securityDetectionEnginePackage).not.toBeUndefined();

      expect(securityDetectionEnginePackage?.name).toBe('security_detection_engine');
    });

    it('should install prebuilt rules from the package that comes bundled with Kibana', async () => {
      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesStatus(es, supertest);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_install).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);

      const bundledInstallResponse = await installPrebuiltRulesPackageByVersion(
        es,
        supertest,
        '99.0.0',
        retry
      );

      // As opposed to "registry"
      expect(bundledInstallResponse._meta.install_source).toBe('bundled');

      // Refresh ES indices to avoid race conditions between write and reading of indeces
      // See implementation utility function at x-pack/test/security_solution_api_integration/test_suites/detections_response/utils/rules/prebuilt_rules/install_prebuilt_rules_fleet_package.ts
      await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });

      // Verify that status is updated after package installation
      const statusAfterPackageInstallation = await getPrebuiltRulesStatus(es, supertest);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_install).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);
    });
  });
};
