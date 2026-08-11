/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatEntitySource } from './entity_data_source_utils';

describe('formatEntitySource', () => {
  it('capitalises a single-word integration key', () => {
    expect(formatEntitySource('crowdstrike')).toBe('Crowdstrike');
  });

  it('splits underscores and capitalises each word', () => {
    expect(formatEntitySource('island_browser')).toBe('Island Browser');
  });

  it('handles multi-segment integration keys', () => {
    expect(formatEntitySource('microsoft_defender_for_endpoint')).toBe(
      'Microsoft Defender For Endpoint'
    );
  });

  it('drops empty segments produced by leading/trailing/double underscores', () => {
    expect(formatEntitySource('_okta__ad_')).toBe('Okta Ad');
  });

  it('leaves an empty string untouched', () => {
    expect(formatEntitySource('')).toBe('');
  });

  it('preserves casing past the first letter (does not lower-case interior letters)', () => {
    expect(formatEntitySource('AzureAD')).toBe('AzureAD');
  });
});
