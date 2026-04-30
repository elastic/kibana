/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import { OS_TITLES } from '../../../../../common/translations';

const OS_LABEL_WIDTH_PX = 80;

export interface OsProtectionRowProps {
  os: OperatingSystem;
  children: ReactNode;
  'data-test-subj'?: string;
  /** Omit trailing rule and spacer after the last OS row in a card. */
  isLast?: boolean;
  /** Use bold OS label (e.g. Event collection rows). */
  osLabelBold?: boolean;
}

export const OsProtectionRow = memo<OsProtectionRowProps>(
  ({ os, children, isLast = false, osLabelBold = false, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    /** Stacks the mode row (dropdown / toggles) above optional panels (notify, etc.) with 16px gap. */
    const rightColumnStackCss = css`
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: ${euiTheme.size.m};
      width: 100%;
      min-width: 0;
    `;

    return (
      <>
        <EuiFlexGroup
          alignItems="flexStart"
          gutterSize="m"
          responsive={false}
          data-test-subj={dataTestSubj}
          css={
            !isLast
              ? css`
                  margin-bottom: ${euiTheme.size.base};
                `
              : undefined
          }
        >
          <EuiFlexItem
            grow={false}
            css={{ width: OS_LABEL_WIDTH_PX, minWidth: OS_LABEL_WIDTH_PX, flexShrink: 0 }}
          >
            <EuiText size="s">
              {osLabelBold ? <strong>{OS_TITLES[os]}</strong> : OS_TITLES[os]}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <div css={rightColumnStackCss}>{children}</div>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isLast && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="m" />
          </>
        )}
      </>
    );
  }
);
OsProtectionRow.displayName = 'OsProtectionRow';
