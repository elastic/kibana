/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CORRELATIONS_DETAILS_TEST_ID } from './test_ids';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { useShowSuppressedAlerts } from '../../shared/hooks/use_show_suppressed_alerts';
import { useDocumentDetailsContext } from '../../shared/context';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { SuppressedAlerts } from './suppressed_alerts';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

export const CORRELATIONS_TAB_ID = 'correlations';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { dataAsNestedObject, eventId, getFieldsData, scopeId, isRulePreview } =
    useDocumentDetailsContext();

  const { indexPatterns } = useSecurityDefaultPatterns();

  const { show: showAlertsByAncestry, documentId } = useShowRelatedAlertsByAncestry({
    getFieldsData,
    dataAsNestedObject,
    eventId,
    isRulePreview,
  });
  const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
    eventId,
    getFieldsData,
  });
  const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ getFieldsData });
  const showCases = useShowRelatedCases({ getFieldsData });
  const { show: showSuppressedAlerts, alertSuppressionCount } = useShowSuppressedAlerts({
    getFieldsData,
  });

  const canShowAtLeastOneInsight =
    showAlertsByAncestry ||
    showSameSourceAlerts ||
    showAlertsBySession ||
    showCases ||
    showSuppressedAlerts;

  return (
    <EuiPanel paddingSize="none" data-test-subj={CORRELATIONS_DETAILS_TEST_ID} color="transparent">
      {canShowAtLeastOneInsight ? (
        <EuiFlexGroup gutterSize="l" direction="column">
          {showSuppressedAlerts && (
            <EuiFlexItem>
              <SuppressedAlerts
                alertSuppressionCount={alertSuppressionCount}
                dataAsNestedObject={dataAsNestedObject}
                showInvestigateInTimeline={!isRulePreview}
              />
            </EuiFlexItem>
          )}
          {showCases && (
            <EuiFlexItem>
              <RelatedCases eventId={eventId} />
            </EuiFlexItem>
          )}
          {showSameSourceAlerts && (
            <EuiFlexItem>
              <RelatedAlertsBySameSourceEvent
                originalEventId={originalEventId}
                scopeId={scopeId}
                eventId={eventId}
              />
            </EuiFlexItem>
          )}
          {showAlertsBySession && entityId && (
            <EuiFlexItem>
              <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} eventId={eventId} />
            </EuiFlexItem>
          )}
          {showAlertsByAncestry && (
            <EuiFlexItem>
              <RelatedAlertsByAncestry
                indices={indexPatterns}
                scopeId={scopeId}
                documentId={documentId}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.noDataDescription"
          defaultMessage="No correlations data available."
        />
      )}
    </EuiPanel>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
