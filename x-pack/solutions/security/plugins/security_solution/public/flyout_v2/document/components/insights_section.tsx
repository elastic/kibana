/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import React, { memo, useCallback, useMemo } from 'react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import { type CellActionRenderer } from '../../shared/components/cell_actions';
import { EventKind } from '../constants/event_kinds';
import { getColumns } from '../../prevalence/utils/get_columns';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from './prevalence_overview';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { CorrelationsDetails } from '../../correlations';
import { ThreatIntelligenceDetails } from '../../threat_intelligence';
import { ChildLink } from '../../shared/components/child_link';
import { PrevalenceDetails } from '../../prevalence';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import {
  CORRELATIONS_TITLE,
  INSIGHTS_SECTION_TITLE,
  PREVALENCE_TITLE,
  THREAT_INTELLIGENCE_TITLE,
} from '../../shared/constants/flyout_titles';

export const INSIGHTS_SECTION_TEST_ID = `${PREFIX}InsightsSection` as const;

const LOCAL_STORAGE_SECTION_KEY = 'insights';

export interface InsightsSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Renderer for cell actions on field values. Falls back to the Security default when not provided.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated: () => void;
}

/**
 * Insights section of the overview tab.
 * Content to be added soon.
 */
export const InsightsSection = memo(
  ({ hit, renderCellActions, onAlertUpdated }: InsightsSectionProps) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: LOCAL_STORAGE_SECTION_KEY,
      defaultValue: true,
    });

    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const ruleId = useMemo(
      () =>
        isAlert
          ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
          : (getFieldValue(hit, 'signal.rule.id') as string),
      [hit, isAlert]
    );
    const { rule } = useRuleWithFallback(ruleId);
    const investigationFields = useMemo(
      () => rule?.investigation_fields?.field_names ?? [],
      [rule?.investigation_fields?.field_names]
    );

    const onShowThreatIntelligenceDetails = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <ThreatIntelligenceDetails hit={hit} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
          title: THREAT_INTELLIGENCE_TITLE,
        }
      );
    }, [history, historyKey, hit, overlays, services, store]);

    const onShowCorrelationsDetails = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <CorrelationsDetails
              hit={hit}
              scopeId=""
              isRulePreview={false}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          ),
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
          title: CORRELATIONS_TITLE,
        }
      );
    }, [history, historyKey, hit, onAlertUpdated, overlays, renderCellActions, services, store]);

    const onShowPrevalenceDetails = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <PrevalenceDetails
              hit={hit}
              investigationFields={investigationFields}
              scopeId={''}
              columns={getColumns(renderCellActions, isInSecurityApp, '', ChildLink)}
            />
          ),
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
          title: PREVALENCE_TITLE,
        }
      );
    }, [
      renderCellActions,
      history,
      historyKey,
      hit,
      investigationFields,
      isInSecurityApp,
      overlays,
      services,
      store,
    ]);

    return (
      <ExpandableSection
        data-test-subj={INSIGHTS_SECTION_TEST_ID}
        expanded={expanded}
        gutterSize="m"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={INSIGHTS_SECTION_TITLE}
      >
        {isAlert && (
          <ThreatIntelligenceOverview
            hit={hit}
            onShowThreatIntelligence={onShowThreatIntelligenceDetails}
            showIcon={false}
          />
        )}
        <CorrelationsOverview
          hit={hit}
          scopeId=""
          isRulePreview={false}
          showIcon={false}
          onShowCorrelationsDetails={onShowCorrelationsDetails}
        />
        <PrevalenceOverview
          hit={hit}
          investigationFields={investigationFields}
          showIcon={false}
          onShowPrevalenceDetails={onShowPrevalenceDetails}
        />
      </ExpandableSection>
    );
  }
);

InsightsSection.displayName = 'InsightsSection';
