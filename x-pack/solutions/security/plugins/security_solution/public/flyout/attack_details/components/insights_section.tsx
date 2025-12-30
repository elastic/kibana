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

const KEY = 'insights';

/**
 * Renders the Overview tab - InsightsSection content in the Attack Details flyout.
 */
export const InsightsSection = memo(() => {
  const expanded = useExpandSection({ title: KEY, defaultValue: true });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.attackDetailsFlyout.overview.insightsSection.sectionTitle"
          defaultMessage="Insights"
        />
      }
      localStorageKey={KEY}
      gutterSize="s"
      data-test-subj="overview-tab-insights-section"
    >
      {'InsightsSection'}
    </ExpandableSection>
  );
});

InsightsSection.displayName = 'InsightsSection';
