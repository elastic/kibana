/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import archiver from 'archiver';
import { dump } from 'js-yaml';
import semver from 'semver';
import { PackageSpecManifest } from '@kbn/fleet-plugin/common';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';

export interface GeneratePrebuiltRulesPackageBaseParams {
  packageName: string;
  packageSemver: string;
  prebuiltRuleAssets: PrebuiltRuleAsset[];
}

interface GeneratePrebuiltRulesPackageParams extends GeneratePrebuiltRulesPackageBaseParams {
  output: NodeJS.WritableStream;
}

/**
 * Generates a prebuilt rules package with the provided name, version, and rule assets.
 *
 * `output` allows to use any writable stream, e.g. a file stream or a PassThrough stream to get a Buffer.
 */
export function generatePrebuiltRulesPackage({
  packageName,
  packageSemver,
  prebuiltRuleAssets,
  output,
}: GeneratePrebuiltRulesPackageParams): void {
  validateSemver(packageSemver);

  const prebuiltRulesPackage = archiver('zip', {
    zlib: { level: 9 },
    forceZip64: true,
  });

  prebuiltRulesPackage.pipe(output);

  const packageRootFolder = `${packageName}-${packageSemver}`;

  prebuiltRulesPackage.append(createPackageManifest(packageName, packageSemver), {
    name: `${packageRootFolder}/manifest.yml`,
  });

  prebuiltRulesPackage.append(createReadmeFileContent(packageName, packageSemver), {
    name: `${packageRootFolder}/docs/README.md`,
  });

  for (const prebuiltRuleAsset of prebuiltRuleAssets) {
    const assetContent = JSON.stringify({
      attributes: prebuiltRuleAsset,
      id: `${prebuiltRuleAsset.rule_id}_${prebuiltRuleAsset.version}`,
      type: 'security-rule',
    });
    const assetFileName = `${packageRootFolder}/kibana/security_rule/rules/${prebuiltRuleAsset.rule_id}_${prebuiltRuleAsset.version}.json`;

    prebuiltRulesPackage.append(Buffer.from(assetContent, 'utf8'), { name: assetFileName });
  }

  prebuiltRulesPackage.finalize();
}

function createPackageManifest(packageName: string, packageSemver: string): Buffer {
  const packageManifest: PackageSpecManifest = {
    name: packageName,
    description: 'Prebuilt detection rules for Elastic Security',
    title: 'Prebuilt Security Detection Rules',
    version: packageSemver,
    owner: { github: 'elastic/protections' },
    format_version: '3.0.0',
  };

  const yamlContent = dump(packageManifest, {
    noRefs: true,
    skipInvalid: true,
  });

  return Buffer.from(yamlContent, 'utf8');
}

function createReadmeFileContent(packageName: string, packageSemver: string): Buffer {
  const readmeContent = `# Mock ${packageName} - ${packageSemver}`;

  return Buffer.from(readmeContent, 'utf8');
}

function validateSemver(version: string): void {
  if (!semver.valid(version)) {
    throw new Error(
      'Provided mock security_detection_engine package version must have semver format like "9.3.1". See https://semver.org/ for more info.'
    );
  }
}
