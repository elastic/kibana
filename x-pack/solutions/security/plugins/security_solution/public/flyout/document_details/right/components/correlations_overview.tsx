/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { SuppressedAlerts } from './suppressed_alerts';
import { useShowSuppressedAlerts } from '../../shared/hooks/use_show_suppressed_alerts';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import { CORRELATIONS_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview: React.FC = () => {
  const { dataAsNestedObject, eventId, getFieldsData, scopeId, isRulePreview, isPreviewMode } =
    useDocumentDetailsContext();

  const { indexPatterns } = useSecurityDefaultPatterns();

  const goToCorrelationsTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: CORRELATIONS_TAB_ID,
  });

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

  const ruleType = get(dataAsNestedObject, ALERT_RULE_TYPE)?.[0] as Type | undefined;

  const link = useMemo(
    () => ({
      callback: goToCorrelationsTab,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.correlations.overviewTooltip"
          defaultMessage="Show all correlations"
        />
      ),
    }),
    [goToCorrelationsTab]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.correlations.overviewTitle"
            defaultMessage="Correlations"
          />
        ),
        link,
        iconType: !isPreviewMode ? 'arrowStart' : undefined,
      }}
      data-test-subj={CORRELATIONS_TEST_ID}
    >
      {canShowAtLeastOneInsight ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          {showSuppressedAlerts && (
            <SuppressedAlerts alertSuppressionCount={alertSuppressionCount} ruleType={ruleType} />
          )}
          {showCases && <RelatedCases eventId={eventId} />}
          {showSameSourceAlerts && (
            <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
          )}
          {showAlertsBySession && entityId && (
            <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
          )}
          {showAlertsByAncestry && (
            <RelatedAlertsByAncestry
              documentId={documentId}
              indices={indexPatterns}
              scopeId={scopeId}
            />
          )}
        </EuiFlexGroup>
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.correlations.noDataDescription"
          defaultMessage="No correlations data available."
        />
      )}
    </ExpandablePanel>
  );
};

CorrelationsOverview.displayName = 'CorrelationsOverview';
