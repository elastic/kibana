/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { AlertSummaryOptionsMenu } from './alert_summary_options_menu';
import { AiSummary } from './ai_summary';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { PREFIX } from '../../../flyout/shared/test_ids';

const LOCAL_STORAGE_SECTION_KEY = 'ai_summary';

export const AI_SUMMARY_SECTION_TEST_ID = `${PREFIX}AISummarySection` as const;

export const AI_SUMMARY_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.alertSummary.aiSummarySection.title',
  {
    defaultMessage: 'Alert summary',
  }
);

export interface AiSummarySectionProps {
  /**
   * Alert document
   */
  hit: DataTableRecord;
}

/**
 * AI Summary section, displayed at the very top of the alert details flyout
 */
export const AiSummarySection = memo(({ hit }: AiSummarySectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: true,
  });

  const [hasAlertSummary, setHasAlertSummary] = useState(false);
  const spaceId = useSpaceId();
  const [showAnonymizedValues = spaceId ? false : undefined, setShowAnonymizedValues] =
    useLocalStorage<boolean | undefined>(
      `securitySolution.aiAlertFlyout.showAnonymization.${spaceId}`
    );

  return (
    <ExpandableSection
      data-test-subj={AI_SUMMARY_SECTION_TEST_ID}
      expanded={expanded}
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={AI_SUMMARY_SECTION_TITLE}
      headerActions={
        <AlertSummaryOptionsMenu
          hasAlertSummary={hasAlertSummary}
          showAnonymizedValues={showAnonymizedValues}
          setShowAnonymizedValues={setShowAnonymizedValues}
        />
      }
    >
      <AiSummary
        hit={hit}
        setHasAlertSummary={setHasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    </ExpandableSection>
  );
});

AiSummarySection.displayName = 'AiSummarySection';
