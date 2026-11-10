/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import type { SVGProps } from 'react';
import React from 'react';

export interface NightshiftMarkIconProps {
  size?: number;
  className?: string;
  /** Align with adjacent text in badges and inline labels. */
  inline?: boolean;
}

/**
 * Mirrors EUI's `productNightshift` glyph (added in @elastic/eui 123.4.0).
 * Kept as a local SVG until Kibana picks up that EUI version, then these wrappers
 * can switch to `type="productNightshift"`.
 */
const NightshiftIconType: React.FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" {...props}>
    <path d="M9.694 3.931a.206.206 0 0 1-.388 0c-.28-.78-.457-.957-1.237-1.237a.206.206 0 0 1 0-.388c.78-.28.957-.457 1.237-1.237a.206.206 0 0 1 .388 0c.28.78.457.957 1.237 1.237a.206.206 0 0 1 0 .388c-.78.28-.957.457-1.237 1.237m2.592 3.699c.058.206.369.206.426 0 .335-1.206.71-1.582 1.914-1.917.206-.058.206-.369 0-.426-1.202-.335-1.578-.71-1.913-1.912-.058-.206-.369-.206-.426 0-.335 1.204-.711 1.579-1.917 1.914-.206.057-.207.368-.001.427 1.204.343 1.584.732 1.917 1.915" />
    <path d="M4.963 1.698c.45-.216.837-.46 1.064-.288s.184.67.173 1.113v.347a6.97 6.97 0 0 0 2.047 4.774 6.98 6.98 0 0 0 5.108 2.048c.495-.011.922-.11 1.175.117.252.227.021.7-.203 1.18l-.132.264a7 7 0 0 1-1.253 1.706l-.261.248a7 7 0 0 1-9.377 0l-.262-.248a7 7 0 0 1-.248-9.638l.248-.261a7 7 0 0 1 1.662-1.232zm.237 1a6 6 0 1 0 8.158 7.993A7.98 7.98 0 0 1 7.54 8.35 7.97 7.97 0 0 1 5.2 2.698m7.087.677c.057-.206.368-.206.426 0 .335 1.202.71 1.577 1.913 1.912.206.057.206.368 0 .426l-.13.04c-1.101.326-1.462.716-1.784 1.877l-.032.068a.23.23 0 0 1-.362 0l-.032-.067c-.312-1.109-.665-1.52-1.701-1.85l-.216-.065c-.206-.059-.205-.37 0-.427 1.207-.335 1.583-.71 1.918-1.914" />
  </svg>
);

/** Nightshift product mark used in the landing hero and significant-event flyout badge. */
export function NightshiftMarkIcon({
  size = 20,
  className,
  inline = false,
}: NightshiftMarkIconProps): React.ReactElement {
  return (
    <NightshiftIconType
      aria-hidden
      className={className}
      width={size}
      height={size}
      css={css`
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
  <EuiIcon type={NightshiftIconType} size={size} {...rest} />
);
