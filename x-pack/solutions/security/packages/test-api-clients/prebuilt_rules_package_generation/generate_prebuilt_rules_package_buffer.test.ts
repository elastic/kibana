/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePrebuiltRulesPackageBuffer } from './generate_prebuilt_rules_package_buffer';

describe('generatePrebuiltRulesPackageBuffer', () => {
  it('creates a zip package', async () => {
    const packageBuffer = await generatePrebuiltRulesPackageBuffer({
      packageName: 'security_detection_engine',
      packageSemver: '1.0.0',
      prebuiltRuleAssets: [],
    });

    expect(packageBuffer.subarray(0, 2)).toEqual(Buffer.from('PK'));
  });
});
