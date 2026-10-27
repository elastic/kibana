/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lookupNameFromFileName } from './splunk_lookup';

describe('lookupNameFromFileName', () => {
  it('strips one extension', () => {
    expect(lookupNameFromFileName('threat_intel_ip.csv')).toBe('threat_intel_ip');
    expect(lookupNameFromFileName('rules_export.xml')).toBe('rules_export');
  });
});
