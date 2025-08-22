/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { RoundedBadge } from '../styles';
import type { DocumentAnalysisOutput } from './analyze_documents';

export const TEST_SUBJ_ALERT_ICON = 'label-node-alert-icon';
export const TEST_SUBJ_ALERT_COUNT = 'label-node-alert-count';
export const TEST_SUBJ_EVENT_COUNT = 'label-node-event-count';

export const LIMIT = 99;
export const displayCount = (count: number) => (count > LIMIT ? `+${LIMIT}` : count);

interface LabelNodeBadgesProps {
  analysis: DocumentAnalysisOutput;
}

export const LabelNodeBadges = ({ analysis }: LabelNodeBadgesProps) => {
  const { euiTheme } = useEuiTheme();

  // Renders no badge
  if (analysis.isSingleEvent) {
    return null;
  }

  return (
    <div
      css={css`
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
    >
      {/* Renders white-background alert badge with icon only */}
      {analysis.isSingleAlert && (
        <RoundedBadge euiTheme={euiTheme}>
          <EuiIcon
            data-test-subj={TEST_SUBJ_ALERT_ICON}
            type="warningFilled"
            color="danger"
            size="s"
          />
        </RoundedBadge>
      )}

      {/* Renders event badge with counter only */}
      {analysis.isGroupOfEvents && (
        <RoundedBadge euiTheme={euiTheme}>
          <EuiText
            data-test-subj={TEST_SUBJ_EVENT_COUNT}
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textHeading};
            `}
          >
            {displayCount(analysis.eventsCount)}
          </EuiText>
        </RoundedBadge>
      )}

      {/* Renders white-background alert badge with warning icon and counter */}
      {analysis.isGroupOfAlerts && (
        <RoundedBadge
          euiTheme={euiTheme}
          css={css`
            gap: ${euiTheme.size.xxs};
          `}
        >
          <EuiIcon
            data-test-subj={TEST_SUBJ_ALERT_ICON}
            type="warningFilled"
            color="danger"
            size="s"
          />
          <EuiText
            data-test-subj={TEST_SUBJ_ALERT_COUNT}
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textHeading};
            `}
          >
            {displayCount(analysis.alertsCount)}
          </EuiText>
        </RoundedBadge>
      )}

      {/* Renders events badge and red-background alert badge with icon and counter */}
      {analysis.isGroupOfEventsAndAlerts && (
        <>
          {/* Events badge */}
          <RoundedBadge euiTheme={euiTheme}>
            <EuiText
              data-test-subj={TEST_SUBJ_EVENT_COUNT}
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
                color: ${euiTheme.colors.textHeading};
              `}
            >
              {displayCount(analysis.eventsCount)}
            </EuiText>
          </RoundedBadge>

          {/* Alerts badge */}
          <RoundedBadge euiTheme={euiTheme} bgColor={euiTheme.colors.danger}>
            <EuiIcon
              data-test-subj={TEST_SUBJ_ALERT_ICON}
              type="warningFilled"
              color="ghost"
              size="s"
            />
            {analysis.alertsCount > 1 && (
              <EuiText
                data-test-subj={TEST_SUBJ_ALERT_COUNT}
                size="xs"
                css={css`
                  font-weight: ${euiTheme.font.weight.medium};
                  color: ${euiTheme.colors.textInverse};
                `}
              >
                {displayCount(analysis.alertsCount)}
              </EuiText>
            )}
          </RoundedBadge>
        </>
      )}
    </div>
  );
};
