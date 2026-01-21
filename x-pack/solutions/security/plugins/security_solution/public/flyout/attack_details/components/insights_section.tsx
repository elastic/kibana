/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';

const KEY = 'insights';

/**
 * Renders the Overview tab - InsightsSection content in the Attack Details flyout.
 */
export const InsightsSection = memo(() => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.attackDetailsFlyout.overview.insightsSection.sectionTitle"
          defaultMessage="Insights"
        />
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="s"
      data-test-subj={KEY}
    >
      {
        // TODO: Add InsightsSection content here
        'InsightsSection'
      }
    </ExpandableSection>
  );
});

InsightsSection.displayName = 'InsightsSection';
