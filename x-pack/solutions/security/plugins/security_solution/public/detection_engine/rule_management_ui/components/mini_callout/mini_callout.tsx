/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { IconType } from '@elastic/eui/src/components/icon';
import type { Color } from '@elastic/eui/src/components/call_out/call_out';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface MiniCalloutProps {
  color?: Color;
  dismissible?: boolean;
  iconType: IconType | undefined;
  title: ReactNode | string;
}

/**
 * A customized mini variant of the EuiCallOut component. Includes additional styling overrides
 * for displaying rich titles when callout size="s", and an option enabling dismissal.
 *
 * @param color color for the callout, defaults to 'primary'
 * @param dismissible whether the callout can be dismissed, defaults to 'true'
 * @param iconType icon for the callout
 * @param title ReactNode or string title text to be displayed
 *
 * @constructor
 */
const MiniCalloutComponent: React.FC<MiniCalloutProps> = ({
  color = 'primary',
  dismissible = true,
  iconType,
  title,
}: MiniCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const calloutTitle = (
    <div
      css={css`
        width: 97%;
        margin-left: ${euiTheme.size.s};
      `}
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        css={css`
          display: flex;
        `}
      >
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none">
            <EuiTextColor
              color="default"
              css={css`
                font-weight: ${euiTheme.font.weight.regular};
              `}
            >
              {title}
            </EuiTextColor>
          </EuiFlexGroup>
        </EuiFlexItem>
        {dismissible && (
          <EuiFlexItem grow={false}>
            <EuiLink
              css={css`
                font-weight: ${euiTheme.font.weight.regular};
              `}
              onClick={() => setIsDismissed(true)}
            >
              {i18n.DISMISS}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );

  return (
    <EuiCallOut size="s" color={color} data-test-subj="mini-callout">
      <div style={{ display: 'flex' }}>
        {iconType && <EuiIcon type={iconType} color={color} />}
        {calloutTitle}
      </div>
    </EuiCallOut>
  );
};

export const MiniCallout = React.memo(MiniCalloutComponent);
MiniCallout.displayName = 'MiniCallout';
