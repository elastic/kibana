/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import React, { memo, useCallback, useMemo } from 'react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useFlyoutApi } from '../../../use_flyout_api';
import { type CellActionRenderer } from '../../../shared/components/cell_actions';
import { EventKind } from '../constants/event_kinds';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from './prevalence_overview';
import { EntitiesOverview } from './entities_overview';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { INSIGHTS_SECTION_TITLE } from '../../../shared/constants/flyout_titles';

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
    const {
      openDocumentFlyoutFromIndexAsChild,
      openDocumentEntities,
      openDocumentCorrelations,
      openDocumentThreatIntelligence,
      openDocumentPrevalence,
      openAttackFlyoutAsChild,
    } = useFlyoutApi();

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
      openDocumentThreatIntelligence({ hit, origin: FLYOUT_ORIGIN.INSIGHTS_THREAT_INTEL });
    }, [openDocumentThreatIntelligence, hit]);

    const onShowAlert = useCallback(
      (id: string, indexName: string, title?: string) =>
        openDocumentFlyoutFromIndexAsChild({
          documentId: id,
          indexName,
          renderCellActions,
          onAlertUpdated,
          origin: FLYOUT_ORIGIN.CORRELATIONS_ALERT,
          title,
        }),
      [openDocumentFlyoutFromIndexAsChild, renderCellActions, onAlertUpdated]
    );

    const onShowEntitiesDetails = useCallback(
      () => openDocumentEntities({ hit, origin: FLYOUT_ORIGIN.INSIGHTS_ENTITIES }),
      [openDocumentEntities, hit]
    );

    const onShowAttack = useCallback(
      (id: string, indexName: string, title?: string) =>
        openAttackFlyoutAsChild({ attackId: id, indexName, attackTitle: title }),
      [openAttackFlyoutAsChild]
    );

    const onShowCorrelationsDetails = useCallback(
      () =>
        openDocumentCorrelations({
          hit,
          scopeId: '',
          isRulePreview: false,
          onShowAlert,
          onShowAttack,
          origin: FLYOUT_ORIGIN.INSIGHTS_CORRELATIONS,
        }),
      [openDocumentCorrelations, hit, onShowAlert, onShowAttack]
    );

    const onShowPrevalenceDetails = useCallback(() => {
      openDocumentPrevalence({
        hit,
        investigationFields,
        scopeId: '',
        renderCellActions,
        origin: FLYOUT_ORIGIN.INSIGHTS_PREVALENCE,
      });
    }, [openDocumentPrevalence, renderCellActions, hit, investigationFields]);

    return (
      <ExpandableSection
        data-test-subj={INSIGHTS_SECTION_TEST_ID}
        expanded={expanded}
        gutterSize="m"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={INSIGHTS_SECTION_TITLE}
      >
        <EntitiesOverview
          hit={hit}
          renderCellActions={renderCellActions}
          showIcon={false}
          onShowEntitiesDetails={onShowEntitiesDetails}
        />
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
