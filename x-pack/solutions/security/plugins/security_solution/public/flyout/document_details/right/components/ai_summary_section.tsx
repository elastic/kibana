/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/constants/local_storage';
import {
  AI_SUMMARY_SECTION_TEST_ID,
  AI_SUMMARY_SECTION_TITLE,
} from '../../../../flyout_v2/document/components/ai_summary_section';
import { AlertSummaryOptionsMenu } from '../../../../flyout_v2/document/components/alert_summary_options_menu';
import { AiSummary } from '../../../../flyout_v2/document/components/ai_summary';
import { useDocumentDetailsContext } from '../../shared/context';
import { useSpaceId } from '../../../../common/hooks/use_space_id';

const LOCAL_STORAGE_SECTION_KEY = 'ai_summary';

/**
 * AI Summary section displayed at the top of the alert details flyout
 */
export const AiSummarySection = memo(() => {
  const { eventId, searchHit } = useDocumentDetailsContext();

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

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

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
        eventId={eventId}
        hit={hit}
        setHasAlertSummary={setHasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    </ExpandableSection>
  );
});

AiSummarySection.displayName = 'AiSummarySection';
