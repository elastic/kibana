/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { OVERVIEW_TAB_TEST_ID } from '../constants/test_ids';
import { AISummarySection } from '../../../flyout_v2/attack/main/components/ai_summary_section';
import { VisualizationsSection } from '../../../flyout_v2/attack/main/components/visualizations_section';
import { InsightsSection } from '../../../flyout_v2/attack/main/components/insights_section';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import { CORRELATION_TAB_ID } from '../constants/left_panel_paths';

/**
 * Renders the Overview tab content in the Attack Details flyout.
 */
export const OverviewTab = memo(() => {
  const { searchHit } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  const openEntitiesLeftPanel = useNavigateToAttackDetailsLeftPanel();
  const openCorrelationsLeftPanel = useNavigateToAttackDetailsLeftPanel({
    subTab: CORRELATION_TAB_ID,
  });

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
        onShowEntities={openEntitiesLeftPanel}
        onShowCorrelations={openCorrelationsLeftPanel}
      />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
