/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCanonicalLookupName, lookupNameFromFileName } from './splunk_lookup';

const missingLookups = ['threat_intel_ip'];

describe('lookupNameFromFileName', () => {
  it('strips one extension', () => {
    expect(lookupNameFromFileName('threat_intel_ip.csv')).toBe('threat_intel_ip');
    expect(lookupNameFromFileName('rules_export.xml')).toBe('rules_export');
  });
});

describe('findCanonicalLookupName', () => {
  it('matches a lookup file name to the list and keeps the list spelling', () => {
    expect(
      findCanonicalLookupName(lookupNameFromFileName('threat_intel_ip.csv'), missingLookups)
    ).toBe('threat_intel_ip');
    expect(findCanonicalLookupName('Threat_Intel_IP', missingLookups)).toBe('threat_intel_ip');
  });

  it('does not match a file name that is not in the list', () => {
    expect(
      findCanonicalLookupName(lookupNameFromFileName('rules_export.xml'), missingLookups)
    ).toBeUndefined();
  });
});
