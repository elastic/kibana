/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Investigation, RecommendedAction } from '@kbn/pnd-common';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

const BRIEF_CATEGORY_COLORS: Record<RecommendedAction, string> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'primary',
  tune: 'accent',
};

interface BriefingContainerProps {
  briefingId: string;
  briefingType: RecommendedAction;
  briefingList: Investigation[];
  children?: React.ReactNode;
}

export const BriefingContainer = memo<BriefingContainerProps>(
  ({ briefingId, briefingType, briefingList, children }) => {
    const { euiTheme } = useEuiTheme();
    const buttonContent = (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{briefingType}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={BRIEF_CATEGORY_COLORS[briefingType]}>{briefingList.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <EuiPanel
        key={briefingId}
        borderRadius="none"
        css={{
          cursor: 'pointer',
          marginBottom: euiTheme.size.xl,
          borderRadius: euiTheme.size.s,
        }}
        paddingSize="none"
        hasBorder
      >
        <EuiAccordion
          id={`briefing-container-${briefingId}`}
          buttonContent={buttonContent}
          initialIsOpen
          paddingSize="none"
          buttonProps={{
            css: css`
              &:hover {
                text-decoration: none;
              }
            `,
          }}
          css={css`
            .euiAccordion__triggerWrapper {
              border-bottom: 1px solid ${euiTheme.colors.disabled};
              padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.m} ${euiTheme.size.m};
              box-sizing: border-box;
            }
          `}
        >
          <EuiFlexGroup direction="column" gutterSize="none">
            {children}
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiPanel>
    );
  }
);

BriefingContainer.displayName = 'BriefingContainer';
