/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { AlertSummarySection } from '../../../../flyout/shared/alert_summary';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { getRawData } from '../../../../assistant/helpers';
import { AI_SUMMARY_SECTION_TEST_ID } from './test_ids';

const LOCAL_STORAGE_SECTION_KEY = 'aiSummary';

const EMPTY_DATA: TimelineEventsDetailsItem[] = [];

const AI_SUMMARY_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.aiSummary.sectionTitle',
  {
    defaultMessage: 'AI summary',
  }
);

export interface AISummarySectionProps {
  /**
   * Document to display the AI summary for.
   */
  hit: DataTableRecord;
}

/**
 * AI summary section under the overview tab of the new flyout_v2 alert
 * details flyout. Thin wrapper around the shared `AlertSummarySection` —
 * fetches `dataFormattedForFieldBrowser` for the given `hit` and forwards
 * the alert id and prompt context as props so the shared section stays
 * context-agnostic.
 */
export const AISummarySection = memo(({ hit }: AISummarySectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: false,
  });

  const { dataFormattedForFieldBrowser } = useEventDetails({
    eventId: hit.raw._id,
    indexName: hit.raw._index,
  });

  const safeData = useMemo(
    () => dataFormattedForFieldBrowser ?? EMPTY_DATA,
    [dataFormattedForFieldBrowser]
  );

  const getPromptContext = useCallback(async () => getRawData(safeData), [safeData]);

  const alertId = hit.raw._id ?? '';

  return (
    <AlertSummarySection
      alertId={alertId}
      getPromptContext={getPromptContext}
      data-test-subj={AI_SUMMARY_SECTION_TEST_ID}
      renderLayout={({ optionsMenu, body }) => (
        <ExpandableSection
          expanded={expanded}
          title={AI_SUMMARY_SECTION_TITLE}
          localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
          sectionId={LOCAL_STORAGE_SECTION_KEY}
          extraAction={optionsMenu}
          data-test-subj={AI_SUMMARY_SECTION_TEST_ID}
        >
          {body}
        </ExpandableSection>
      )}
    />
  );
});

AISummarySection.displayName = 'AISummarySection';
