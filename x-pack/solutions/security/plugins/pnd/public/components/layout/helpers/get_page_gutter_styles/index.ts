/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSObject } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

/**
 * The size token the page gutter consumes.
 *
 * Narrowed to a `Pick` rather than the whole scale so the token *name* is part
 * of the signature: renaming it in EUI breaks this type check instead of
 * silently insetting the page by `undefined`.
 */
export type PageGutterSizes = Pick<EuiThemeComputed['size'], 'm'>;

/**
 * The horizontal inset that keeps page content off the viewport edge, ported
 * from the Daybreak prototype's `overviewMainGutterStyles` at `10e153f`.
 *
 * The gutter is a separate element from the column so the column stays exactly
 * centered: the inset shrinks the space the column is centered within rather
 * than shifting the column itself.
 */
export const getPageGutterStyles = ({ m }: PageGutterSizes): CSSObject => ({
  boxSizing: 'border-box',
  paddingInline: m,
  width: '100%',
});
