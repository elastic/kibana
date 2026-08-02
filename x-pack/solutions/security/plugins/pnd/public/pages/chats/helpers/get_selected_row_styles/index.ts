/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';

export interface GetSelectedRowStylesParams {
  border: Pick<EuiThemeComputed['border'], 'radius'>;
  colors: Pick<EuiThemeComputed['colors'], 'primary'>;
}

/**
 * How the row `?conversationId=` named is told apart from the rows around it.
 *
 * A `box-shadow` ring rather than a `border`, because the row's own `EuiPanel` already owns its
 * border: a second one would either replace the panel's or shift every unselected row by a pixel
 * as the panel opens and closes.
 *
 * Tokens arrive as a narrow `Pick` of the theme scale, so a token rename fails the type check here
 * instead of interpolating `undefined` into a style string.
 */
export const getSelectedRowStyles = ({
  border,
  colors,
}: GetSelectedRowStylesParams): CSSObject => ({
  borderRadius: border.radius.medium,
  boxShadow: `0 0 0 2px ${colors.primary}`,
});
