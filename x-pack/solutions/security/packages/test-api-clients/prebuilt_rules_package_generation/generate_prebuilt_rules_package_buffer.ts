/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { GeneratePrebuiltRulesPackageBaseParams } from './generate_prebuilt_rules_package';
import { generatePrebuiltRulesPackage } from './generate_prebuilt_rules_package';

export async function generatePrebuiltRulesPackageBuffer({
  packageName,
  packageSemver,
  prebuiltRuleAssets,
}: GeneratePrebuiltRulesPackageBaseParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];

    output.on('data', (chunk) => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);

    generatePrebuiltRulesPackage({
      packageName,
      packageSemver,
      prebuiltRuleAssets,
      output,
    });
  });
}
