/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import { dump } from 'js-yaml';
import semver from 'semver';
import type { PackageSpecManifest } from '@kbn/fleet-plugin/common';
import type { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';

interface CreatePrebuiltRulesPackageParams {
  packageName: string;
  packageSemver: string;
  prebuiltRuleAssets: PrebuiltRuleAsset[];
}

export function createPrebuiltRulesPackage({
  packageName,
  packageSemver,
  prebuiltRuleAssets,
}: CreatePrebuiltRulesPackageParams): AdmZip {
  validateSemver(packageSemver);

  const packageRootFolder = `${packageName}-${packageSemver}`;
  const prebuiltRulesPackage = new AdmZip();

  prebuiltRulesPackage.addFile(
    `${packageRootFolder}/manifest.yml`,
    createPackageManifest(packageName, packageSemver)
  );

  for (const prebuiltRuleAsset of prebuiltRuleAssets) {
    const assetContent = JSON.stringify({
      attributes: prebuiltRuleAsset,
      id: prebuiltRuleAsset.rule_id,
      type: 'security-rule',
    });
    const assetFileName = `${packageRootFolder}/kibana/security_rule/rules/${prebuiltRuleAsset.rule_id}_${prebuiltRuleAsset.version}.json`;

    prebuiltRulesPackage.addFile(assetFileName, Buffer.from(assetContent, 'utf8'));
  }

  return prebuiltRulesPackage;
}

function createPackageManifest(packageName: string, packageSemver: string): Buffer {
  const packageManifest: PackageSpecManifest = {
    name: packageName,
    title: 'Prebuilt Security Detection Rules',
    version: packageSemver,
    owner: { github: 'elastic/protections' },
  };

  const yamlContent = dump(packageManifest, {
    noRefs: true,
    skipInvalid: true,
  });

  return Buffer.from(yamlContent, 'utf8');
}

function validateSemver(version: string): void {
  if (!semver.valid(version)) {
    throw new Error(
      'Provided mock security_detection_engine package version must have semver format like "9.3.1". See https://semver.org/ for more info.'
    );
  }
}
