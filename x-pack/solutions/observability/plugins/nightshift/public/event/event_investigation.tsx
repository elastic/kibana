/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { InvestigationOutput, type InvestigationStatus } from '@kbn/investigation-output';
import type { SignificantEventInvestigation } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { useKibana } from '../hooks/use_kibana';

export interface EventInvestigationProps {
  /** The latest investigation the significant event records. */
  investigation?: SignificantEventInvestigation;
  status: InvestigationStatus;
  /** The investigation from the shared investigations API, once read. */
  details?: Investigation;
  error?: string;
}

/**
 * The significant event's latest investigation, read from the shared investigations API.
 * "Show details" opens the investigation's Agent Builder conversation details flyout.
 */
export function EventInvestigation({
  investigation,
  status,
  details,
  error,
}: EventInvestigationProps): React.ReactElement {
  const { agentBuilder } = useKibana().services;
  const conversationId = details?.id;

  const openDetails = useCallback(() => {
    if (conversationId) {
      void agentBuilder?.openConversationDetails({ conversationId });
    }
  }, [agentBuilder, conversationId]);

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
        {agentBuilder && conversationId && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              color="primary"
              data-test-subj="nightshiftInvestigationShowDetailsButton"
              onClick={openDetails}
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
      ) : (
        <InvestigationOutput status={status} investigation={details} error={error} />
      )}
    </>
  );
}
