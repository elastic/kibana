/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

import type { PndHitlTone } from '../get_hitl_tone';

/**
 * The twelve theme tokens the card's three tones interpolate.
 *
 * Narrowed to a `Pick` rather than the whole palette so the token *names* are
 * part of the signature: renaming one in EUI breaks this type check instead of
 * painting `undefined` into a border.
 */
export type PndHitlToneColors = Pick<
  EuiThemeComputed['colors'],
  | 'backgroundBaseDanger'
  | 'backgroundBasePrimary'
  | 'backgroundBaseWarning'
  | 'backgroundFilledDanger'
  | 'backgroundFilledPrimary'
  | 'backgroundFilledWarning'
  | 'borderBaseDanger'
  | 'borderBasePrimary'
  | 'borderBaseWarning'
  | 'textDanger'
  | 'textPrimary'
  | 'textWarning'
>;

export interface PndHitlToneTokens {
  border: string;
  /** The footer button's EUI colour, so the primary action matches the chrome. */
  buttonColor: PndHitlTone;
  eyebrowText: string;
  headerBackground: string;
  iconBackground: string;
}

/**
 * The card chrome for one tone, ported from the prototype's `useToneTokens`.
 *
 * The five tokens travel together because they are one visual decision: a
 * header background that did not match its border, or a footer button that did
 * not match either, would read as two different severities on one card.
 */
export const getHitlToneTokens = (
  tone: PndHitlTone,
  colors: PndHitlToneColors
): PndHitlToneTokens => {
  if (tone === 'danger') {
    return {
      border: colors.borderBaseDanger,
      buttonColor: 'danger',
      eyebrowText: colors.textDanger,
      headerBackground: colors.backgroundBaseDanger,
      iconBackground: colors.backgroundFilledDanger,
    };
  }

  if (tone === 'warning') {
    return {
      border: colors.borderBaseWarning,
      buttonColor: 'warning',
      eyebrowText: colors.textWarning,
      headerBackground: colors.backgroundBaseWarning,
      iconBackground: colors.backgroundFilledWarning,
    };
  }

  return {
    border: colors.borderBasePrimary,
    buttonColor: 'primary',
    eyebrowText: colors.textPrimary,
    headerBackground: colors.backgroundBasePrimary,
    iconBackground: colors.backgroundFilledPrimary,
  };
};
