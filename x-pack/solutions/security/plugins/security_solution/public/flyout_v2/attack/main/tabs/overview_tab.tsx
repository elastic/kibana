/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';
import { DocumentFlyoutWrapper } from '../../../document/main/document_flyout_wrapper';
import { CorrelationsDetails } from '../../tools/correlations';
import { EntitiesDetails } from '../../tools/entities';
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
}

/**
 * Overview tab content for the attack flyout v2.
 * Renders summary, visualizations, and insights sections separated by horizontal rules to match
 * the legacy attack details flyout. Owns the callbacks that open the Entities/Correlations tools
 * (and, from Correlations, an alert) as child flyouts via the new flyout system.
 */
export const OverviewTab = memo(({ hit, onAttackUpdated }: OverviewTabProps) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const alertIds = useAttackAlertIds(hit);

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyoutWrapper
              documentId={id}
              indexName={indexName}
              renderCellActions={noopCellActionRenderer}
              onAlertUpdated={onAttackUpdated}
            />
          ),
        }),
        { ...defaultDocumentFlyoutProperties, historyKey, session: 'inherit' }
      ),
    [
      defaultDocumentFlyoutProperties,
      history,
      historyKey,
      onAttackUpdated,
      overlays,
      services,
      store,
    ]
  );

  const onShowCorrelations = useCallback(
    () =>
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <CorrelationsDetails hit={hit} alertIds={alertIds} onShowAlert={onShowAlert} />,
        }),
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' }
      ),
    [alertIds, history, historyKey, hit, onShowAlert, overlays, services, store]
  );

  const onShowEntities = useCallback(
    () =>
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <EntitiesDetails hit={hit} alertIds={alertIds} />,
        }),
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' }
      ),
    [alertIds, history, historyKey, hit, overlays, services, store]
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
