/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useMemo } from 'react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { PrevalenceOverview } from './prevalence_overview';

export const INSIGHTS_SECTION_TEST_ID = `${PREFIX}InsightsSection` as const;

export const INSIGHTS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.insights.sectionTitle',
  {
    defaultMessage: 'Insights',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'insights';

export interface InsightsSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Insights section of the overview tab.
 * Content to be added soon.
 */
export const InsightsSection = memo(({ hit }: InsightsSectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: true,
  });

  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);
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

  const onShowPrevalenceDetails = useCallback(() => {}, []);

  return (
    <ExpandableSection
      data-test-subj={INSIGHTS_SECTION_TEST_ID}
      expanded={expanded}
      gutterSize="m"
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={INSIGHTS_SECTION_TITLE}
    >
      <PrevalenceOverview
        hit={hit}
        investigationFields={investigationFields}
        showIcon={false}
        onShowPrevalenceDetails={onShowPrevalenceDetails}
      />
    </ExpandableSection>
  );
});

InsightsSection.displayName = 'InsightsSection';
