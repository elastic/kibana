/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { CorrelationsOverview } from '../../../../flyout_v2/document/components/correlations_overview';
import { PrevalenceOverview } from '../../../../flyout_v2/document/components/prevalence_overview';
import { ThreatIntelligenceOverview } from '../../../../flyout_v2/document/components/threat_intelligence_overview';
import { EntitiesOverview } from '../../../../flyout_v2/document/components/entities_overview';
import { INSIGHTS_TEST_ID } from './test_ids';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../../../flyout_v2/document/constants/event_kinds';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { LeftPanelInsightsTab } from '../../left';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../../../flyout_v2/threat_intelligence';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import { ENTITIES_TAB_ID } from '../../left/components/entities_details';
import { CellActions } from '../../shared/components/cell_actions';

const KEY = 'insights';

/**
 * Insights section under overview tab. It contains entities, threat intelligence, prevalence and correlations.
 */
export const InsightsSection = memo(() => {
  const { getFieldsData, investigationFields, isPreviewMode, searchHit, scopeId, isRulePreview } =
    useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const renderCellActions = useCallback<CellActionRenderer>(
    ({ children, field, value }) => (
      <CellActions field={field} value={value as string | string[] | null | undefined}>
        {children}
      </CellActions>
    ),
    []
  );

  const goToEntitiesTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: ENTITIES_TAB_ID,
  });

  const goToThreatIntelligenceTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: THREAT_INTELLIGENCE_TAB_ID,
  });

  const goToCorrelationsTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: CORRELATIONS_TAB_ID,
  });

  const goToPrevalenceTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: PREVALENCE_TAB_ID,
  });

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.sectionTitle"
          defaultMessage="Insights"
        />
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      data-test-subj={INSIGHTS_TEST_ID}
    >
      <EntitiesOverview
        hit={hit}
        scopeId={scopeId}
        showIcon={!isPreviewMode}
        renderCellActions={renderCellActions}
        onShowEntitiesDetails={goToEntitiesTab}
        enableEntityLinks
      />
      {eventKind === EventKind.signal && (
        <>
          <EuiSpacer size="s" />
          <ThreatIntelligenceOverview
            hit={hit}
            showIcon={!isPreviewMode}
            onShowThreatIntelligence={goToThreatIntelligenceTab}
          />
        </>
      )}
      <EuiSpacer size="s" />
      <CorrelationsOverview
        hit={hit}
        scopeId={scopeId}
        isRulePreview={isRulePreview}
        showIcon={!isPreviewMode}
        onShowCorrelationsDetails={goToCorrelationsTab}
      />
      <EuiSpacer size="s" />
      <PrevalenceOverview
        hit={hit}
        investigationFields={investigationFields}
        showIcon={!isPreviewMode}
        onShowPrevalenceDetails={goToPrevalenceTab}
      />
    </ExpandableSection>
  );
});

InsightsSection.displayName = 'InsightsSection';
