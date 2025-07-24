/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import type { DocumentAnalysis } from './analyze_documents';

const BadgeContainer = styled.div<{ euiTheme: any }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 2px 4px;
  background-color: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};
  border: 1px solid ${({ euiTheme }) => euiTheme.colors.borderBasePlain};
  margin-left: 4px;
`;

const BadgesContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

interface LabelNodeBadgesProps {
  analysis: DocumentAnalysis;
}

export const LabelNodeBadges = ({ analysis }: LabelNodeBadgesProps) => {
  const { euiTheme } = useEuiTheme();

  // Single event - no badge
  if (analysis.isSingleEvent) {
    return null;
  }

  return (
    <BadgesContainer>
      {/* Single alert - red warning icon */}
      {analysis.isSingleAlert && (
        <BadgeContainer euiTheme={euiTheme}>
          <EuiIcon 
            type="warningFilled" 
            color="danger" 
            size="s"
          />
        </BadgeContainer>
      )}

      {/* Group of events - counter only */}
      {analysis.isGroupOfEvents && (
        <BadgeContainer euiTheme={euiTheme}>
          <EuiText 
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
              color: ${euiTheme.colors.textPrimary};
            `}
          >
            +{analysis.totalEvents}
          </EuiText>
        </BadgeContainer>
      )}

      {/* Group of alerts - warning icon with counter */}
      {analysis.isGroupOfAlerts && (
        <BadgeContainer euiTheme={euiTheme}>
          <EuiIcon 
            type="warningFilled" 
            color="danger" 
            size="s"
            css={css`
              margin-right: 2px;
            `}
          />
          <EuiText 
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
              color: ${euiTheme.colors.textPrimary};
            `}
          >
            +{analysis.totalAlerts}
          </EuiText>
        </BadgeContainer>
      )}

      {/* Group of events and alerts - both badges */}
      {analysis.isGroupOfEventsAndAlerts && (
        <>
          {/* Events badge */}
          <BadgeContainer euiTheme={euiTheme}>
            <EuiText 
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
                color: ${euiTheme.colors.textPrimary};
              `}
            >
              +{analysis.totalEvents}
            </EuiText>
          </BadgeContainer>
          
          {/* Alerts badge */}
          <BadgeContainer euiTheme={euiTheme}>
            <EuiIcon 
              type="warningFilled" 
              color="danger" 
              size="s"
              css={css`
                margin-right: 2px;
              `}
            />
            <EuiText 
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
                color: ${euiTheme.colors.textPrimary};
              `}
            >
              +{analysis.totalAlerts}
            </EuiText>
          </BadgeContainer>
        </>
      )}
    </BadgesContainer>
  );
};