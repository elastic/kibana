/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from '../../../../flyout_v2/document/components/prevalence_overview';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { INSIGHTS_TEST_ID } from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../../../flyout_v2/document/constants/event_kinds';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { LeftPanelInsightsTab } from '../../left';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';

const KEY = 'insights';

/**
 * Insights section under overview tab. It contains entities, threat intelligence, prevalence and correlations.
 */
export const InsightsSection = memo(() => {
  const { getFieldsData, searchHit, investigationFields, isPreviewMode } =
    useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

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
      <EntitiesOverview />
      {eventKind === EventKind.signal && (
        <>
          <EuiSpacer size="s" />
          <ThreatIntelligenceOverview />
        </>
      )}
      <EuiSpacer size="s" />
      <CorrelationsOverview />
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
