/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { useShowRelatedAttacks } from '../../correlations/hooks/use_show_related_attacks';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useShowRelatedAlertsBySession } from '../../correlations/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useShowRelatedAlertsBySameSourceEvent } from '../../correlations/hooks/use_show_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from '../../correlations/hooks/use_show_related_alerts_by_ancestry';
import { SuppressedAlerts } from './suppressed_alerts';
import { useShowSuppressedAlerts } from '../../correlations/hooks/use_show_suppressed_alerts';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../correlations/hooks/use_show_related_cases';
import { RelatedAttacks } from './related_attacks';
import { CORRELATIONS_TEST_ID } from './test_ids';

export interface CorrelationsOverviewProps {
  /**
   * The data table record document
   */
  hit: DataTableRecord;
  /**
   * Scope id for the flyout
   */
  scopeId: string;
  /**
   * Boolean indicating if the flyout is open in rule preview
   */
  isRulePreview: boolean;
  /**
   * Whether to show the arrow icon in the panel header
   */
  showIcon: boolean;
  /**
   * Callback to navigate to correlations details
   */
  onShowCorrelationsDetails: () => void;
}

/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview = memo(
  ({
    hit,
    scopeId,
    isRulePreview,
    showIcon,
    onShowCorrelationsDetails,
  }: CorrelationsOverviewProps) => {
    const documentId = useMemo(() => hit.raw._id || '', [hit.raw._id]);

    const { show: showAlertsByAncestry, ancestryDocumentId } = useShowRelatedAlertsByAncestry({
      hit,
      isRulePreview,
    });
    const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
      hit,
    });
    const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({
      hit,
    });
    const showCases = useShowRelatedCases({ hit });
    const { show: showSuppressedAlerts, alertSuppressionCount } = useShowSuppressedAlerts({
      hit,
    });
    const { show: showRelatedAttacks, attackIds } = useShowRelatedAttacks({ hit });

    const canShowAtLeastOneInsight =
      showAlertsByAncestry ||
      showSameSourceAlerts ||
      showAlertsBySession ||
      showCases ||
      showSuppressedAlerts ||
      showRelatedAttacks;

    const ruleType = getFieldValue(hit, ALERT_RULE_TYPE) as Type | undefined;

    const link = useMemo(
      () => ({
        callback: onShowCorrelationsDetails,
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.insights.correlations.overviewTooltip"
            defaultMessage="Show all correlations"
          />
        ),
      }),
      [onShowCorrelationsDetails]
    );

    return (
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.document.insights.correlations.overviewTitle"
              defaultMessage="Correlations"
            />
          ),
          link,
          iconType: showIcon ? 'arrowStart' : undefined,
        }}
        data-test-subj={CORRELATIONS_TEST_ID}
      >
        {canShowAtLeastOneInsight ? (
          <EuiFlexGroup direction="column" gutterSize="s">
            {showSuppressedAlerts && (
              <SuppressedAlerts
                alertSuppressionCount={alertSuppressionCount}
                ruleType={ruleType}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
            {showCases && (
              <RelatedCases
                eventId={documentId}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
            {showSameSourceAlerts && (
              <RelatedAlertsBySameSourceEvent
                originalEventId={originalEventId}
                scopeId={scopeId}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
            {showAlertsBySession && entityId && (
              <RelatedAlertsBySession
                entityId={entityId}
                scopeId={scopeId}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
            {showAlertsByAncestry && (
              <RelatedAlertsByAncestry
                documentId={ancestryDocumentId}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
            {showRelatedAttacks && (
              <RelatedAttacks
                attackIds={attackIds}
                onShowCorrelationsDetails={onShowCorrelationsDetails}
              />
            )}
          </EuiFlexGroup>
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.insights.correlations.noDataDescription"
            defaultMessage="No correlations data available."
          />
        )}
      </ExpandablePanel>
    );
  }
);

CorrelationsOverview.displayName = 'CorrelationsOverview';
