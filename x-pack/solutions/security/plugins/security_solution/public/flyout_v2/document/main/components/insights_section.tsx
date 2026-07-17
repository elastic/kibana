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
import { getColumns } from '../../tools/prevalence/utils/get_columns';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from './prevalence_overview';
import { EntitiesOverview } from './entities_overview';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import type { OpenFlyoutLinkProps } from '../../../shared/components/open_flyout_link';
import { OpenFlyoutLink } from '../../../shared/components/open_flyout_link';
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
    const isInSecurityApp = useIsInSecurityApp();
    const {
      openDocumentFlyoutFromIndexAsChild,
      openDocumentEntities,
      openDocumentCorrelations,
      openDocumentThreatIntelligence,
      openDocumentPrevalence,
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
      openDocumentThreatIntelligence({ hit });
    }, [openDocumentThreatIntelligence, hit]);

    const onShowAlert = useCallback(
      (id: string, indexName: string, title?: string) =>
        openDocumentFlyoutFromIndexAsChild({
          documentId: id,
          indexName,
          renderCellActions,
          onAlertUpdated,
          title,
        }),
      [openDocumentFlyoutFromIndexAsChild, renderCellActions, onAlertUpdated]
    );

    const onShowEntitiesDetails = useCallback(
      () => openDocumentEntities({ hit }),
      [openDocumentEntities, hit]
    );

    const onShowCorrelationsDetails = useCallback(
      () => openDocumentCorrelations({ hit, scopeId: '', isRulePreview: false, onShowAlert }),
      [openDocumentCorrelations, hit, onShowAlert]
    );

    const renderFlyoutLink = useCallback(
      (props: OpenFlyoutLinkProps) => <OpenFlyoutLink {...props} />,
      []
    );

    const onShowPrevalenceDetails = useCallback(() => {
      openDocumentPrevalence({
        hit,
        investigationFields,
        scopeId: '',
        columns: getColumns(renderCellActions, isInSecurityApp, '', renderFlyoutLink),
      });
    }, [
      openDocumentPrevalence,
      renderCellActions,
      hit,
      investigationFields,
      isInSecurityApp,
      renderFlyoutLink,
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
