/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useShowRelatedAttacks } from './hooks/use_show_related_attacks';
import { useShowRelatedAlertsByAncestry } from './hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from './hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from './hooks/use_show_related_alerts_by_session';
import { useShowRelatedCases } from './hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from './hooks/use_show_suppressed_alerts';
import { SuppressedAlerts } from './components/suppressed_alerts';
import { RelatedCases } from './components/related_cases';
import { RelatedAlertsBySameSourceEvent } from './components/related_alerts_by_same_source_event';
import { RelatedAlertsBySession } from './components/related_alerts_by_session';
import { RelatedAlertsByAncestry } from './components/related_alerts_by_ancestry';
import { RelatedAttacks } from './components/related_attacks';

export interface CorrelationsDetailsProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Scope ID for the document
   */
  scopeId: string;
  /**
   * Whether the document is being displayed in a rule preview
   */
  isRulePreview: boolean;
  /**
   * Callback to open an alert preview when clicking the preview button in the correlations table
   */
  onShowAlert: (id: string, indexName: string) => void;
  /**
   * Whether to hide the rule preview link in the correlations table.
   * Defaults to true (hidden) for the new tools flyout which has no expandable flyout context.
   */
  hidePreviewLink?: boolean;
}

/**
 * Displays the full correlations details for a given alert/event document.
 * This component is meant to be used in a tools flyout, with the new EUI flyout system.
 */
export const CorrelationsDetails = memo(
  ({
    hit,
    scopeId,
    isRulePreview,
    onShowAlert,
    hidePreviewLink = true,
  }: CorrelationsDetailsProps) => {
    const eventId = hit.raw._id ?? '';
    const ecsData = useMemo<Ecs>(
      () => ({
        ...(hit.raw._source ?? {}),
        _id: hit.raw._id ?? '',
        _index: hit.raw._index,
      }),
      [hit]
    );

    const { show: showAlertsByAncestry, ancestryDocumentId } = useShowRelatedAlertsByAncestry({
      hit,
      isRulePreview,
    });
    const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
      hit,
    });
    const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ hit });
    const showCases = useShowRelatedCases({ hit });
    const { show: showSuppressedAlerts, alertSuppressionCount } = useShowSuppressedAlerts({
      hit,
    });
    const { show: showRelatedAttacks, attackIds } = useShowRelatedAttacks({ hit });

    const canShowAtLeastOneInsight =
      showAlertsByAncestry ||
      showSameSourceAlerts ||
      showAlertsBySession ||
      showRelatedAttacks ||
      showCases ||
      showSuppressedAlerts;

    return (
      <EuiPanel color="transparent">
        {canShowAtLeastOneInsight ? (
          <EuiFlexGroup gutterSize="l" direction="column">
            {showSuppressedAlerts && (
              <EuiFlexItem>
                <SuppressedAlerts
                  alertSuppressionCount={alertSuppressionCount}
                  ecsData={ecsData}
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
                  onShowAlert={onShowAlert}
                  hidePreviewLink={hidePreviewLink}
                />
              </EuiFlexItem>
            )}
            {showAlertsBySession && entityId && (
              <EuiFlexItem>
                <RelatedAlertsBySession
                  entityId={entityId}
                  scopeId={scopeId}
                  eventId={eventId}
                  onShowAlert={onShowAlert}
                  hidePreviewLink={hidePreviewLink}
                />
              </EuiFlexItem>
            )}
            {showAlertsByAncestry && (
              <EuiFlexItem>
                <RelatedAlertsByAncestry
                  scopeId={scopeId}
                  documentId={ancestryDocumentId}
                  onShowAlert={onShowAlert}
                  hidePreviewLink={hidePreviewLink}
                />
              </EuiFlexItem>
            )}
            {showRelatedAttacks && (
              <EuiFlexItem>
                <RelatedAttacks attackIds={attackIds} scopeId={scopeId} eventId={eventId} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.correlations.noDataDescription"
            defaultMessage="No correlations data available."
          />
        )}
      </EuiPanel>
    );
  }
);

CorrelationsDetails.displayName = 'CorrelationsDetails';
