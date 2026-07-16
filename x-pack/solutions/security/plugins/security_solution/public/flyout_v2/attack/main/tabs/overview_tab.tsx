/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { useFlyoutApi } from '../../../use_flyout_api';
import { AISummarySection } from '../components/ai_summary_section';
import { VisualizationsSection } from '../components/visualizations_section';
import { InsightsSection } from '../components/insights_section';
import { useAttackAlertIds } from '../hooks/use_attack_alert_ids';

export interface OverviewTabProps {
  /**
   * The raw attack document hit.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked after alert mutations to refresh the flyout content.
   */
  onAttackUpdated: () => void;
  /**
   * Renderer for cell actions in nested alert flyouts.
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Overview tab content for the attack flyout v2.
 * Renders summary, visualizations, and insights sections separated by horizontal rules to match
 * the legacy attack details flyout. Owns the callbacks that open the Entities/Correlations tools
 * (and, from Correlations, an alert) as child flyouts via the new flyout system.
 */
export const OverviewTab = memo(({ hit, onAttackUpdated, renderCellActions }: OverviewTabProps) => {
  const { openAttackCorrelations, openAttackEntities, openDocumentFlyoutFromIndexAsChild } =
    useFlyoutApi();

  const alertIds = useAttackAlertIds(hit);

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      openDocumentFlyoutFromIndexAsChild({
        documentId: id,
        indexName,
        renderCellActions,
        onAlertUpdated: onAttackUpdated,
      }),
    [openDocumentFlyoutFromIndexAsChild, onAttackUpdated, renderCellActions]
  );

  const onShowCorrelations = useCallback(
    () => openAttackCorrelations({ hit, alertIds, onShowAlert }),
    [openAttackCorrelations, hit, alertIds, onShowAlert]
  );

  const onShowEntities = useCallback(
    () => openAttackEntities({ hit, alertIds }),
    [openAttackEntities, hit, alertIds]
  );

  return (
    <div data-test-subj="attack-flyout-overview-tab">
      <AISummarySection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <InsightsSection
        hit={hit}
        onShowCorrelations={onShowCorrelations}
        onShowEntities={onShowEntities}
      />
    </div>
  );
});

OverviewTab.displayName = 'OverviewTab';
