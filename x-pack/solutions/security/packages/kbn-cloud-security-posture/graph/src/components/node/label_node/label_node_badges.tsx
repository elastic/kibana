/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DocumentAnalysisOutput } from './analyze_documents';

export const TEST_SUBJ_ALERT_ICON = 'label-node-alert-icon';
export const TEST_SUBJ_ALERT_COUNT = 'label-node-alert-count';
export const TEST_SUBJ_ALERT_COUNT_BUTTON = 'label-node-alert-count-button';
export const TEST_SUBJ_EVENT_COUNT = 'label-node-event-count';
export const TEST_SUBJ_EVENT_COUNT_BUTTON = 'label-node-event-count-button';

export const LIMIT = 99;
export const displayCount = (count: number) => (count > LIMIT ? `+${LIMIT}` : String(count));

const POPOVER_EVENT_ARIA_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.labelBadges.eventAriaLabel',
  {
    defaultMessage: 'Show event details',
  }
);

const POPOVER_ALERT_ARIA_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.labelBadges.alertAriaLabel',
  {
    defaultMessage: 'Show alert details',
  }
);

interface LabelNodeBadgesProps {
  analysis: DocumentAnalysisOutput;
  isActive?: boolean;
  onEventClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const stopPropagation = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.stopPropagation();
};

const EventCountBadge = ({
  count,
  onEventClick,
}: {
  count: number;
  onEventClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const label = displayCount(count);

  if (onEventClick) {
    return (
      <EuiButtonEmpty
        size="xs"
        color="text"
        flush="both"
        data-test-subj={TEST_SUBJ_EVENT_COUNT_BUTTON}
        onClick={(e) => {
          stopPropagation(e);
          onEventClick(e);
        }}
        aria-label={POPOVER_EVENT_ARIA_LABEL}
        css={css`
          height: auto;
          min-height: 0;
          padding: 0;
        `}
      >
        <EuiBadge color="hollow" data-test-subj={TEST_SUBJ_EVENT_COUNT}>
          {label}
        </EuiBadge>
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiBadge color="hollow" data-test-subj={TEST_SUBJ_EVENT_COUNT}>
      {label}
    </EuiBadge>
  );
};

const AlertCountBadge = ({
  count,
  isActive,
  onEventClick,
}: {
  count: number;
  isActive?: boolean;
  onEventClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const label = displayCount(count);
  const badge = (
    <span data-test-subj={TEST_SUBJ_ALERT_ICON}>
      <EuiBadge
        color="danger"
        iconType="warningFilled"
        iconSide="left"
        data-test-subj={TEST_SUBJ_ALERT_COUNT}
        css={isActive ? css({ backgroundColor: 'inherit' }) : undefined}
      >
        {label}
      </EuiBadge>
    </span>
  );

  if (onEventClick) {
    return (
      <EuiButtonEmpty
        size="xs"
        color="text"
        flush="both"
        data-test-subj={TEST_SUBJ_ALERT_COUNT_BUTTON}
        onClick={(e) => {
          stopPropagation(e);
          onEventClick(e);
        }}
        aria-label={POPOVER_ALERT_ARIA_LABEL}
        css={css`
          height: auto;
          min-height: 0;
          padding: 0;
        `}
      >
        {badge}
      </EuiButtonEmpty>
    );
  }

  return badge;
};

const AlertIconBadge = () => (
  <EuiBadge
    color="danger"
    iconType="warningFilled"
    iconSide="left"
    data-test-subj={TEST_SUBJ_ALERT_ICON}
    aria-label={POPOVER_ALERT_ARIA_LABEL}
  />
);

export const LabelNodeBadges = ({ analysis, isActive, onEventClick }: LabelNodeBadgesProps) => {
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
      {analysis.isGroupOfEvents && (
        <EventCountBadge count={analysis.uniqueEventsCount} onEventClick={onEventClick} />
      )}
      {analysis.isGroupOfAlerts && (
        <AlertCountBadge
          count={analysis.uniqueAlertsCount}
          isActive={isActive}
          onEventClick={onEventClick}
        />
      )}
      {analysis.isGroupOfEventsAndAlerts && (
        <>
          <EventCountBadge count={analysis.uniqueEventsCount} onEventClick={onEventClick} />
          <AlertCountBadge
            count={analysis.uniqueAlertsCount}
            isActive={isActive}
            onEventClick={onEventClick}
          />
        </>
      )}
    </div>
  );
};
