/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExplicitSynonym, isExplicitSynonym } from './synonyms_utils';

describe('isExplicitSynonym util function', () => {
  it('should return true if synonym includes "=>"', () => {
    expect(isExplicitSynonym('synonym1 => synonym2')).toBe(true);
    expect(isExplicitSynonym('synonym1,synonym2, synonym5 => synonym2')).toBe(true);
    expect(isExplicitSynonym('       synonym1,synonym2, synonym5        => synonym2      ')).toBe(
      true
    );
  });
  it('should return false if synonym does not include "=>"', () => {
    expect(isExplicitSynonym('synonym1')).toBe(false);
    expect(isExplicitSynonym('synonym1,synonym2, synonym5')).toBe(false);
    expect(isExplicitSynonym('       synonym1,synonym2, synonym5        ')).toBe(false);
  });
});

describe('getExplicitSynonym util function', () => {
  it('should return an array with the explicit synonym', () => {
    expect(getExplicitSynonym('synonym1 => synonym2')).toEqual(['synonym1', 'synonym2']);
    expect(getExplicitSynonym('synonym1,synonym2, synonym5 => synonym2')).toEqual([
      'synonym1,synonym2, synonym5',
      'synonym2',
    ]);
    expect(
      getExplicitSynonym('       synonym1,synonym2, synonym5        => synonym2      ')
    ).toEqual(['synonym1,synonym2, synonym5', 'synonym2']);
  });
});
