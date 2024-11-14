/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs/promises';
import path from 'path';
import getMajorVersion from 'semver/functions/major';
import getMinorVersion from 'semver/functions/minor';
import { REPO_ROOT } from '@kbn/repo-info';
import JSON5 from 'json5';
import expect from 'expect';
import { PackageSpecManifest } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllPrebuiltRuleAssets,
  getInstalledRules,
  getPrebuiltRulesStatus,
  installPrebuiltRules,
  installPrebuiltRulesPackageByVersion,
  performUpgradePrebuiltRules,
  reviewPrebuiltRulesToInstall,
  reviewPrebuiltRulesToUpgrade,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  let currentVersion: string;
  let previousVersion: string;

  /*
   * Recursively query the Fleet EPM API to find the latest GA patch
   * version of the previous minor version of the current package
   */
  const getPreviousMinorGAVersion = async (
    majorVersion: number,
    minorVersion: number,
    patchVersion: number
  ): Promise<string> => {
    // Failsafe check to prevent infinite recursion in case no GA
    // patch version is published for the previous minor version
    if (patchVersion > 15) {
      throw new Error('Unable to find previous minor GA version');
    }
    const EPM_URL = `/api/fleet/epm/packages/security_detection_engine/${majorVersion}.${minorVersion}.${patchVersion}`;

    const getPackageResponse = await supertest
      .get(EPM_URL)
      .set('kbn-xsrf', 'xxxx')
      .type('application/json')
      .send({ force: true });

    if (getPackageResponse.status !== 200 || getPackageResponse.body?.item.release !== 'ga') {
      return getPreviousMinorGAVersion(majorVersion, minorVersion, patchVersion + 1);
    }
    return getPackageResponse.body.item.version ?? '';
  };

  describe('@ess @serverless @skipInServerlessMKI update_prebuilt_rules_package', () => {
    before(async () => {
      const configFilePath = path.resolve(REPO_ROOT, 'fleet_packages.json');
      const fleetPackages = await fs.readFile(configFilePath, 'utf8');

      const parsedFleetPackages: PackageSpecManifest[] = JSON5.parse(fleetPackages);

      const securityDetectionEnginePackage = parsedFleetPackages.find(
        (fleetPackage) => fleetPackage.name === 'security_detection_engine'
      );

      currentVersion = securityDetectionEnginePackage?.version ?? '';

      const majorVersion = getMajorVersion(currentVersion);
      const minorVersion = getMinorVersion(currentVersion);

      expect(securityDetectionEnginePackage).not.toBeUndefined();

      try {
        previousVersion = await getPreviousMinorGAVersion(majorVersion, minorVersion - 1, 0);
      } catch (error) {
        // If no previous minor GA version is found, carry out test with existing current version
        previousVersion = currentVersion;
      }
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it('should allow user to install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package', async () => {
      // PART 1: Install prebuilt rules from the previous minor version as the current version

      // Verify that status is empty before package installation
      const statusBeforePackageInstallation = await getPrebuiltRulesStatus(es, supertest);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_installed).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_install).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);
      expect(statusBeforePackageInstallation.stats.num_prebuilt_rules_total_in_package).toBe(0);

      const installPreviousPackageResponse = await installPrebuiltRulesPackageByVersion(
        es,
        supertest,
        previousVersion,
        retry
      );

      expect(installPreviousPackageResponse._meta.install_source).toBe('registry');
      expect(installPreviousPackageResponse.items.length).toBeGreaterThan(0);

      // Verify that status is updated after the installation of package "N-1"
      const statusAfterPackageInstallation = await getPrebuiltRulesStatus(es, supertest);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_installed).toBe(0);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_install).toBeGreaterThan(0);
      expect(statusAfterPackageInstallation.stats.num_prebuilt_rules_to_upgrade).toBe(0);
      expect(
        statusAfterPackageInstallation.stats.num_prebuilt_rules_total_in_package
      ).toBeGreaterThan(0);

      // Verify that _review endpoint returns the same number of rules to install as the status endpoint
      const prebuiltRulesToInstallReview = await reviewPrebuiltRulesToInstall(supertest);
      expect(prebuiltRulesToInstallReview.stats.num_rules_to_install).toBe(
        statusAfterPackageInstallation.stats.num_prebuilt_rules_to_install
      );

      // Verify that the _perform endpoint returns the same number of installed rules as the status endpoint
      // and the _review endpoint
      const installPrebuiltRulesResponse = await installPrebuiltRules(es, supertest);

      expect(installPrebuiltRulesResponse.summary.succeeded).toBe(
        statusAfterPackageInstallation.stats.num_prebuilt_rules_to_install
      );
      expect(installPrebuiltRulesResponse.summary.succeeded).toBe(
        prebuiltRulesToInstallReview.stats.num_rules_to_install
      );

      // Get installed rules
      const rulesResponse = await getInstalledRules(supertest);

      // Check that all prebuilt rules were actually installed
      expect(rulesResponse.total).toBe(installPrebuiltRulesResponse.summary.succeeded);
      expect(
        installPrebuiltRulesResponse.results.created.map((rule: { rule_id: string }) => ({
          rule_id: rule.rule_id,
        }))
      ).toEqual(
        expect.arrayContaining(
          rulesResponse.data.map((rule: { rule_id: string }) => ({ rule_id: rule.rule_id }))
        )
      );

      // PART 2: Now install the lastest (current) package, defined in fleet_packages.json

      const installLatestPackageResponse = await installPrebuiltRulesPackageByVersion(
        es,
        supertest,
        currentVersion,
        retry
      );
      expect(installLatestPackageResponse.items.length).toBeGreaterThanOrEqual(0);

      // Verify status after intallation of the latest package
      const statusAfterLatestPackageInstallation = await getPrebuiltRulesStatus(es, supertest);
      expect(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_installed
      ).toBeGreaterThan(0);
      expect(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_install
      ).toBeGreaterThanOrEqual(0);
      expect(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_upgrade
      ).toBeGreaterThanOrEqual(0);
      expect(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_total_in_package
      ).toBeGreaterThan(0);

      // Verify that _review endpoint returns the same number of rules to install as the status endpoint
      const prebuiltRulesToInstallReviewAfterLatestPackageInstallation =
        await reviewPrebuiltRulesToInstall(supertest);
      expect(
        prebuiltRulesToInstallReviewAfterLatestPackageInstallation.stats.num_rules_to_install
      ).toBe(statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_install);

      // Install available rules and verify that the _perform endpoint returns the same number of
      // installed rules as the status endpoint and the _review endpoint
      const installPrebuiltRulesResponseAfterLatestPackageInstallation = await installPrebuiltRules(
        es,
        supertest
      );

      expect(installPrebuiltRulesResponseAfterLatestPackageInstallation.summary.succeeded).toBe(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_install
      );
      expect(
        installPrebuiltRulesResponseAfterLatestPackageInstallation.summary.succeeded
      ).toBeGreaterThanOrEqual(
        prebuiltRulesToInstallReviewAfterLatestPackageInstallation.stats.num_rules_to_install
      );

      // Get installed rules
      const rulesResponseAfterPackageUpdate = await getInstalledRules(supertest);

      // Check that the expected new prebuilt rules from the latest package were actually installed
      expect(
        rulesResponseAfterPackageUpdate.data.map((rule: { rule_id: string }) => ({
          rule_id: rule.rule_id,
        }))
      ).toEqual(
        expect.arrayContaining(
          installPrebuiltRulesResponseAfterLatestPackageInstallation.results.created.map(
            (rule: { rule_id: string }) => ({
              rule_id: rule.rule_id,
            })
          )
        )
      );

      // Verify that the upgrade _review endpoint returns the same number of rules to upgrade as the status endpoint
      const prebuiltRulesToUpgradeReviewAfterLatestPackageInstallation =
        await reviewPrebuiltRulesToUpgrade(supertest);
      expect(
        prebuiltRulesToUpgradeReviewAfterLatestPackageInstallation.stats.num_rules_to_upgrade_total
      ).toBe(statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_upgrade);

      // Call the upgrade _perform endpoint to upgrade all rules to their target version and verify that the number
      // of upgraded rules is the same as the one returned by the _review endpoint and the status endpoint
      const upgradePrebuiltRulesResponseAfterLatestPackageInstallation =
        await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'TARGET',
        });

      expect(upgradePrebuiltRulesResponseAfterLatestPackageInstallation.summary.succeeded).toEqual(
        statusAfterLatestPackageInstallation.stats.num_prebuilt_rules_to_upgrade
      );
      expect(upgradePrebuiltRulesResponseAfterLatestPackageInstallation.summary.succeeded).toEqual(
        prebuiltRulesToUpgradeReviewAfterLatestPackageInstallation.stats.num_rules_to_upgrade_total
      );

      // Get installed rules

      const rulesResponseAfterPackageUpdateAndRuleUpgrades = await getInstalledRules(supertest);

      // Check that the expected new prebuilt rules from the latest package were actually installed
      expect(
        rulesResponseAfterPackageUpdateAndRuleUpgrades.data.map((rule: { rule_id: string }) => ({
          rule_id: rule.rule_id,
        }))
      ).toEqual(
        expect.arrayContaining(
          upgradePrebuiltRulesResponseAfterLatestPackageInstallation.results.updated.map(
            (rule: { rule_id: string }) => ({
              rule_id: rule.rule_id,
            })
          )
        )
      );
    });
  });
};
