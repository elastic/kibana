/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { GeneratePrebuiltRulesPackageBaseParams } from './generate_prebuilt_rules_package';
import { generatePrebuiltRulesPackage } from './generate_prebuilt_rules_package';

interface GeneratePrebuiltRulesPackageZipFileParams extends GeneratePrebuiltRulesPackageBaseParams {
  filePath: string;
}

export async function generatePrebuiltRulesPackageZipFile({
  packageName,
  packageSemver,
  prebuiltRuleAssets,
  filePath,
}: GeneratePrebuiltRulesPackageZipFileParams): Promise<void> {
  return new Promise((resolve, reject) => {
    // Make sure the path exists
    mkdirSync(dirname(filePath), { recursive: true });

    const fileStream = createWriteStream(filePath);

    fileStream.on('close', resolve);
    fileStream.on('error', reject);

    generatePrebuiltRulesPackage({
      packageName,
      packageSemver,
      prebuiltRuleAssets,
      output: fileStream,
    });
  });
}
