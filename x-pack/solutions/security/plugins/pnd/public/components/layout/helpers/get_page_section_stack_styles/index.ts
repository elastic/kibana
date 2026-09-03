/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSObject } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

/**
 * The size tokens the section stack consumes.
 *
 * Narrowed to a `Pick` rather than the whole scale so the token *names* are
 * part of the signature: renaming either in EUI breaks this type check instead
 * of silently collapsing the stack's spacing to `undefined`.
 */
export type PageSectionStackSizes = Pick<EuiThemeComputed['size'], 'l' | 'xxl'>;

/**
 * The vertical rhythm of a PND page's sections, ported from the Daybreak
 * prototype's landing page inner styles at `10e153f`.
 *
 * The gap between sections is deliberately smaller than the block padding that
 * opens and closes the page, so the sections read as one group.
 */
export const getPageSectionStackStyles = ({ l, xxl }: PageSectionStackSizes): CSSObject => ({
  display: 'flex',
  flexDirection: 'column',
  gap: l,
  paddingBlock: xxl,
});
