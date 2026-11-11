/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';

export interface NightshiftMarkIconProps {
  size?: number;
  className?: string;
  /** Align with adjacent text in badges and inline labels. */
  inline?: boolean;
}

/** Nightshift product mark used in the landing hero and significant-event flyout badge. */
export function NightshiftMarkIcon({
  size = 20,
  className,
  inline = false,
}: NightshiftMarkIconProps): React.ReactElement {
  return (
    <EuiIcon
      type="productNightshift"
      aria-hidden
      className={className}
      css={css`
        display: ${inline ? 'inline-block' : 'block'};
        flex-shrink: 0;
        height: ${size}px;
        vertical-align: ${inline ? 'middle' : 'initial'};
        width: ${size}px;
      `}
    />
  );
}

export const NightshiftNavigationIcon = ({
  size = 'm',
  ...rest
}: Omit<EuiIconProps, 'type'>): React.ReactElement => (
  <EuiIcon type="productNightshift" size={size} {...rest} />
);
