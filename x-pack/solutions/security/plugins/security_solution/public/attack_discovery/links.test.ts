/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_FEATURE_ID } from '../../common/constants';
import { SECURITY_FEATURE_ID } from '../../common';
import { links } from './links';

describe('links', () => {
  it('for serverless, it specifies capabilities as an AND condition, via a nested array', () => {
    expect(links.capabilities).toEqual<string[][]>([
      [`${SECURITY_FEATURE_ID}.show`, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
    ]);
  });

  it('for self managed, it requires an enterprise license', () => {
    expect(links.licenseType).toEqual('enterprise');
  });
});
