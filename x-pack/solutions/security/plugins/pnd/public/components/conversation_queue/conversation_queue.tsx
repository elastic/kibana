/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import {
  CONVERSATION_QUEUE_LABELS,
  CONVERSATION_CATEGORY_COLORS,
  type Investigation,
  type RecommendedAction,
} from '@kbn/pnd-common';
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
import { EMPTY_CONVERSATION_QUEUE } from './translations';
import { ConversationCard } from '../conversation_card';

interface ConversationQueueProps {
  briefingId: string;
  briefingType: RecommendedAction;
  briefingList: Investigation[];
}

const StyledAccordion = styled(EuiAccordion)`
  &.euiAccordion-isOpen {
    .euiAccordion__triggerWrapper {
      border-bottom: 1px solid ${({ theme }) => theme.euiTheme.colors.disabled};
    }
  }

  .euiAccordion__triggerWrapper {
    padding: ${({ theme }) =>
      `${theme.euiTheme.size.m} ${theme.euiTheme.size.l} ${theme.euiTheme.size.m} ${theme.euiTheme.size.m}`};
    box-sizing: border-box;
  }
`;

export const ConversationQueue = memo<ConversationQueueProps>(
  ({ briefingId, briefingType, briefingList }) => {
    const { euiTheme } = useEuiTheme();
    const buttonContent = (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{CONVERSATION_QUEUE_LABELS[briefingType]}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={CONVERSATION_CATEGORY_COLORS[briefingType]}>
            {briefingList.length}
          </EuiBadge>
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
        <StyledAccordion
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
        >
          {briefingList.length > 0 ? (
            <EuiFlexGroup direction="column" gutterSize="none">
              {briefingList.map((investigation, i) => (
                <EuiFlexItem key={investigation.id} grow={false}>
                  <ConversationCard
                    investigation={investigation}
                    hasBorder={i < briefingList.length - 1}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <EuiPanel>
              <EuiText size="s" color="subdued">
                {EMPTY_CONVERSATION_QUEUE}
              </EuiText>
            </EuiPanel>
          )}
        </StyledAccordion>
      </EuiPanel>
    );
  }
);

ConversationQueue.displayName = 'ConversationQueue';
