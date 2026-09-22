/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type {
  InvestigationState,
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import {
  InvestigationFlyout,
  type InvestigationFlyoutTabId,
} from '../investigation/investigation_flyout';
import { InvestigationSummaryCard } from '../investigation/investigation_summary_card';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

export interface EventInvestigationProps {
  event: SignificantEvent;
  investigation?: SignificantEventInvestigation;
  status: InvestigationStatus;
  state?: InvestigationState;
  error?: string;
  conversationId?: string;
}

export function EventInvestigation({
  event,
  investigation,
  status,
  state,
  error,
  conversationId,
}: EventInvestigationProps): React.ReactElement {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [flyoutTab, setFlyoutTab] = useState<InvestigationFlyoutTabId>('recommendations');
  const [tabRequestId, setTabRequestId] = useState(0);

  const openFlyout = useCallback((tab: InvestigationFlyoutTabId = 'recommendations') => {
    setFlyoutTab(tab);
    setTabRequestId((current) => current + 1);
    setIsFlyoutOpen(true);
  }, []);

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.nightshift.flyout.investigationTitle', {
                defaultMessage: 'Investigation',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {investigation?.workflow_execution_id && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              color="primary"
              data-test-subj="nightshiftInvestigationShowDetailsButton"
              onClick={() => openFlyout()}
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
                element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT_INVESTIGATION,
                detail: status,
              })}
            >
              {i18n.translate('xpack.nightshift.flyout.investigationShowDetails', {
                defaultMessage: 'Show details',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {!investigation ? (
        <EuiText size="s" color="subdued" data-test-subj="nightshiftInvestigationEmptyState">
          <p>
            {i18n.translate('xpack.nightshift.flyout.investigationEmptyDescription', {
              defaultMessage: 'No investigation yet.',
            })}
          </p>
        </EuiText>
      ) : !investigation.workflow_execution_id ? (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          size="s"
          title={i18n.translate('xpack.nightshift.flyout.investigationMissingWorkflowTitle', {
            defaultMessage: 'Investigation unavailable',
          })}
          data-test-subj="nightshiftInvestigationMissingWorkflowCallout"
        >
          <EuiText size="s">
            {i18n.translate('xpack.nightshift.flyout.investigationMissingWorkflowDescription', {
              defaultMessage:
                'This investigation is missing workflow details and cannot be loaded.',
            })}
          </EuiText>
        </EuiCallOut>
      ) : (
        <InvestigationSummaryCard
          eventTitle={event.title}
          status={status}
          state={state}
          error={error}
          startedAt={investigation.started_at}
          completedAt={investigation.completed_at}
          onShowMoreRecommendations={() => openFlyout('recommendations')}
        />
      )}

      {isFlyoutOpen && investigation?.workflow_execution_id && (
        <InvestigationFlyout
          eventTitle={event.title}
          investigation={investigation}
          status={status}
          state={state}
          error={error}
          conversationId={conversationId}
          initialTab={flyoutTab}
          tabRequestId={tabRequestId}
          onClose={() => setIsFlyoutOpen(false)}
        />
      )}
    </>
  );
}
