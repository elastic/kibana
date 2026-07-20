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
  EuiLink,
  EuiTextColor,
  useEuiTheme,
  type EuiCallOutProps,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import * as i18n from './translations';

export interface MiniCalloutProps {
  color?: EuiCallOutProps['color'];
  dismissible?: boolean;
  title: ReactNode | string;
  'data-test-subj'?: string;
}

/**
 * A customized mini variant of the EuiCallOut component. Includes additional styling overrides
 * for displaying rich titles when callout size="s", and an option enabling dismissal.
 *
 * @param color color for the callout, defaults to 'primary'
 * @param dismissible whether the callout can be dismissed, defaults to 'true'
 * @param title ReactNode or string title text to be displayed
 * @param dataTestSubj data-test-subj attribute for testing purposes, defaults to 'mini-callout'
 */
export const MiniCallout = memo(function MiniCallout({
  color = 'primary',
  dismissible = true,
  title,
  'data-test-subj': dataTestSubj = 'mini-callout',
}: MiniCalloutProps): JSX.Element | null {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, { on: dismiss }] = useBoolean(false);

  if (isDismissed) {
    return null;
  }

  const calloutTitle = (
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
            onClick={dismiss}
          >
            {i18n.DISMISS}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiCallOut size="s" color={color} data-test-subj={dataTestSubj}>
      {calloutTitle}
    </EuiCallOut>
  );
});
