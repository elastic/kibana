/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { OVERVIEW_TAB_TEST_ID } from '../constants/test_ids';
import { AISummarySection } from '../components/ai_summary_section';
import { VisualizationsSection } from '../components/visualizations_section';
import { InsightsSection } from '../components/insights_section';

/**
 * Renders the Overview tab content in the Attack Details flyout.
 */
export const OverviewTab = memo(() => {
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      data-test-subj={OVERVIEW_TAB_TEST_ID}
      aria-label={i18n.translate(
        'xpack.securitySolution.attackDetailsFlyout.overview.overviewContentAriaLabel',
        { defaultMessage: 'Overview' }
      )}
    >
      <AISummarySection />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection />
      <EuiHorizontalRule margin="m" />
      <InsightsSection />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
