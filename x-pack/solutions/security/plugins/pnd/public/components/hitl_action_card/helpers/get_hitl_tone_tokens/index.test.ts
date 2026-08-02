/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHitlToneTokens } from '.';
import type { PndHitlToneColors } from '.';

/** Fake tokens, so the test asserts the mapping rather than EUI's palette. */
const colors: PndHitlToneColors = {
  backgroundBaseDanger: 'baseDanger',
  backgroundBasePrimary: 'basePrimary',
  backgroundBaseWarning: 'baseWarning',
  backgroundFilledDanger: 'filledDanger',
  backgroundFilledPrimary: 'filledPrimary',
  backgroundFilledWarning: 'filledWarning',
  borderBaseDanger: 'borderDanger',
  borderBasePrimary: 'borderPrimary',
  borderBaseWarning: 'borderWarning',
  textDanger: 'textDanger',
  textPrimary: 'textPrimary',
  textWarning: 'textWarning',
};

describe('getHitlToneTokens', () => {
  it('returns the danger tokens for the danger tone', () => {
    expect(getHitlToneTokens('danger', colors)).toEqual({
      border: 'borderDanger',
      buttonColor: 'danger',
      eyebrowText: 'textDanger',
      headerBackground: 'baseDanger',
      iconBackground: 'filledDanger',
    });
  });

  it('returns the warning tokens for the warning tone', () => {
    expect(getHitlToneTokens('warning', colors)).toEqual({
      border: 'borderWarning',
      buttonColor: 'warning',
      eyebrowText: 'textWarning',
      headerBackground: 'baseWarning',
      iconBackground: 'filledWarning',
    });
  });

  it('returns the primary tokens for the primary tone', () => {
    expect(getHitlToneTokens('primary', colors)).toEqual({
      border: 'borderPrimary',
      buttonColor: 'primary',
      eyebrowText: 'textPrimary',
      headerBackground: 'basePrimary',
      iconBackground: 'filledPrimary',
    });
  });

  it('returns a button color that matches the tone, so the footer cannot drift from the chrome', () => {
    expect(getHitlToneTokens('warning', colors).buttonColor).toEqual('warning');
  });
});
