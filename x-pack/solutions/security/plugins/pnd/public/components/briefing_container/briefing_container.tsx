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
  EuiTitle,
  EuiPanel,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { BRIEFING_CONTAINER_LABELS, EMPTY_BRIEFING_QUEUE } from './translations';
import { BriefingCard } from '../briefing_card';

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
}

export const BriefingContainer = memo<BriefingContainerProps>(
  ({ briefingId, briefingType, briefingList }) => {
    const { euiTheme } = useEuiTheme();
    const buttonContent = (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{BRIEFING_CONTAINER_LABELS[briefingType]}</h3>
          </EuiTitle>
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
          {briefingList.length > 0 ? (
            <EuiFlexGroup direction="column" gutterSize="none">
              {briefingList.map((investigation, i) => (
                <EuiFlexItem key={investigation.id} grow={false}>
                  <BriefingCard
                    investigation={investigation}
                    hasBorder={i < briefingList.length - 1}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <EuiPanel>
              <EuiText size="s" color="subdued">
                {EMPTY_BRIEFING_QUEUE}
              </EuiText>
            </EuiPanel>
          )}
        </EuiAccordion>
      </EuiPanel>
    );
  }
);

BriefingContainer.displayName = 'BriefingContainer';
