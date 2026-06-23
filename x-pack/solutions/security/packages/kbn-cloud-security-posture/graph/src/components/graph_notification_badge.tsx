/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, type Interpolation, type Theme } from '@emotion/react';
import { EuiNotificationBadge, type EuiNotificationBadgeProps } from '@elastic/eui';

/** Pill-shaped notification badges per current EUI badge standards. */
export const graphNotificationBadgeCss = css`
  border-radius: 999px;
`;

export const GraphNotificationBadge = ({
  css: customCss,
  ...props
}: EuiNotificationBadgeProps) => (
  <EuiNotificationBadge
    css={[graphNotificationBadgeCss, customCss as Interpolation<Theme>]}
    {...props}
  />
);
