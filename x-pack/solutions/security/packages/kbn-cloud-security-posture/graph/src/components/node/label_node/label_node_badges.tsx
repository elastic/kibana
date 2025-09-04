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

const CountText: React.FC<{ testSubj: string; color: string; children: React.ReactNode }> = ({
  testSubj,
  color,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      data-test-subj={testSubj}
      size="xs"
      color={color}
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
      `}
    >
      {children}
    </EuiText>
  );
};

const AlertIcon: React.FC<{ color: string }> = ({ color }) => (
  <EuiIcon data-test-subj={TEST_SUBJ_ALERT_ICON} type="warningFilled" color={color} size="s" />
);

const EventBadge: React.FC<{ count: number }> = ({ count }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <RoundedBadge>
      <CountText testSubj={TEST_SUBJ_EVENT_COUNT} color={euiTheme.colors.textHeading}>
        {displayCount(count)}
      </CountText>
    </RoundedBadge>
  );
};

const AlertCountBadge: React.FC<{ count: number; inverted?: boolean }> = ({ count, inverted }) => {
  const { euiTheme } = useEuiTheme();
  const bgColor = inverted ? euiTheme.colors.danger : undefined;
  const iconColor = inverted ? euiTheme.colors.backgroundBasePlain : 'danger';
  const textColor = inverted ? euiTheme.colors.textInverse : euiTheme.colors.textHeading;

  return (
    <RoundedBadge bgColor={bgColor}>
      <AlertIcon color={iconColor} />
      <CountText testSubj={TEST_SUBJ_ALERT_COUNT} color={textColor}>
        {displayCount(count)}
      </CountText>
    </RoundedBadge>
  );
};

const AlertIconBadge: React.FC = () => (
  <RoundedBadge>
    <AlertIcon color="danger" />
  </RoundedBadge>
);
export const LabelNodeBadges = ({ analysis }: LabelNodeBadgesProps) => {
  const { euiTheme } = useEuiTheme();

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
      {analysis.isSingleAlert && <AlertIconBadge />}
      {analysis.isGroupOfEvents && <EventBadge count={analysis.eventsCount} />}
      {analysis.isGroupOfAlerts && <AlertCountBadge count={analysis.alertsCount} />}
      {analysis.isGroupOfEventsAndAlerts && (
        <>
          <EventBadge count={analysis.eventsCount} />
          <AlertCountBadge count={analysis.alertsCount} inverted />
        </>
      )}
    </div>
  );
};
