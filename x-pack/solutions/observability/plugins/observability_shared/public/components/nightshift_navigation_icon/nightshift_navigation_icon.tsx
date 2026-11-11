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

/** EUI icon for the Elastic nightshift product (added in EUI v123.4.0, elastic/eui#10256). */
const NIGHTSHIFT_ICON_TYPE = 'productNightshift';

export interface NightshiftMarkIconProps {
  size?: number;
  className?: string;
  /** Align with adjacent text in badges and inline labels. */
  inline?: boolean;
}

/** Product mark used in the landing hero and significant-event flyout badge. */
export function NightshiftMarkIcon({
  size = 20,
  className,
  inline = false,
}: NightshiftMarkIconProps): React.ReactElement {
  return (
    <EuiIcon
      aria-hidden
      type={NIGHTSHIFT_ICON_TYPE}
      size="original"
      className={className}
      css={css`
        width: ${size}px;
        height: ${size}px;
        display: ${inline ? 'inline-block' : 'block'};
        flex-shrink: 0;
        vertical-align: ${inline ? 'middle' : 'initial'};
      `}
    />
  );
}

export const NightshiftNavigationIcon = ({
  size = 'm',
  ...rest
}: Omit<EuiIconProps, 'type'>): React.ReactElement => (
  <EuiIcon type={NIGHTSHIFT_ICON_TYPE} size={size} {...rest} />
);
