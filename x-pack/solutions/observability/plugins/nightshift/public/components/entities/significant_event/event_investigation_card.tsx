/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import {
  INVESTIGATION_VIEW_SOURCES,
  reportNightshiftInvestigationViewed,
} from '../../../common/ebt_events';
import { useKibana } from '../../../hooks/use_kibana';
import { SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS } from './significant_event_status';

interface EventInvestigationCardProps {
  /** A worker is still running for the investigation (the shared list API's `in_progress`). */
  inProgress: boolean;
  investigation?: Investigation;
  status: InvestigationStatus;
}

export const EventInvestigationCard = ({
  inProgress,
  investigation,
  status,
}: EventInvestigationCardProps): React.ReactElement => {
  const { agentBuilder, analytics } = useKibana().services;
  const conversationId = investigation?.id;
  const title =
    investigation?.title && !investigation.title_pending
      ? investigation.title
      : i18n.translate('xpack.nightshift.flyout.investigationCardTitle', {
          defaultMessage: 'Investigation',
        });
  const canOpen = agentBuilder != null && conversationId != null;
  // This path opens the flyout without `?investigationId=`, so the landing page's view reporter
  // never sees it: report the view here so the click joins to the investigation it opened.
  const handleOpen = useCallback(() => {
    if (agentBuilder == null || conversationId == null) {
      return;
    }
    reportNightshiftInvestigationViewed(analytics, {
      investigationId: conversationId,
      source: INVESTIGATION_VIEW_SOURCES.CLICK,
      investigation,
    });
    void agentBuilder.openConversationDetails({ conversationId });
  }, [agentBuilder, analytics, conversationId, investigation]);
  const statusLabel =
    SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS[inProgress ? 'in_progress' : 'completed'];

  const content = (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar type="space" iconType="inspect" name={title} aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <p>
            <strong>{title}</strong>
          </p>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.nightshift.flyout.investigationCardStatusLabel', {
            defaultMessage: 'Investigation · {status}',
            values: {
              status: statusLabel,
            },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (!canOpen) {
    return (
      <EuiPanel hasBorder data-test-subj="nightshiftEventInvestigationCard">
        {content}
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasBorder
      onClick={handleOpen}
      data-test-subj="nightshiftEventInvestigationCard"
      {...getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
        element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT_INVESTIGATION,
        detail: status,
      })}
    >
      {content}
    </EuiPanel>
  );
};
