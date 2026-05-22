/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { OVERVIEW_TAB_TEST_ID } from '../constants/test_ids';
import { AISummarySection } from '../components/ai_summary_section';
import { VisualizationsSection } from '../components/visualizations_section';
import { InsightsSection } from '../components/insights_section';

export interface OverviewTabProps {
  /**
   * The attack-discovery document hit. Forwarded to every child section.
   */
  hit: DataTableRecord;
  /**
   * Callback that opens the attack-specific Entities child flyout. Forwarded
   * to {@link InsightsSection} → {@link EntitiesOverview}.
   */
  onShowAttackEntities: () => void;
  /**
   * Callback that opens the attack-specific Correlations child flyout.
   * Forwarded to {@link InsightsSection} → {@link CorrelationsOverview}.
   */
  onShowAttackCorrelations: () => void;
}

/**
 * Renders the Overview tab content in the Attack Details flyout.
 */
export const OverviewTab: React.FC<OverviewTabProps> = memo(
  ({ hit, onShowAttackEntities, onShowAttackCorrelations }) => {
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
        <AISummarySection hit={hit} />
        <EuiHorizontalRule margin="m" />
        <VisualizationsSection hit={hit} />
        <EuiHorizontalRule margin="m" />
        <InsightsSection
          hit={hit}
          onShowAttackEntities={onShowAttackEntities}
          onShowAttackCorrelations={onShowAttackCorrelations}
        />
      </EuiPanel>
    );
  }
);

OverviewTab.displayName = 'OverviewTab';
