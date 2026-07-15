/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useFlyoutApi } from '../../../use_flyout_api';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { AnalyzerPreviewContainer } from './analyzer_preview_container';
import { SessionPreviewContainer } from './session_preview_container';
import { GraphPreviewContainer } from './graph_preview_container';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { useSessionViewConfig } from '../../tools/session_view/hooks/use_session_view_config';

export const VISUALIZATION_SECTION_TEST_ID = `${PREFIX}Visualizations` as const;

export const VISUALIZATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.visualizations.sectionTitle',
  {
    defaultMessage: 'Visualizations',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'visualizations';

export interface VisualizationsSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Optional prop to pass cell action renderer to the analyzer graph.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated: () => void;
}

/**
 * Third section of the overview tab in details flyout.
 * It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(
  ({ hit, renderCellActions, onAlertUpdated }: VisualizationsSectionProps) => {
    const { openAnalyzer, openSessionView, openDocumentGraph } = useFlyoutApi();
    const sessionViewConfig = useSessionViewConfig(hit);
    const { hasGraphData } = useGraphPreview({ hit });

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: LOCAL_STORAGE_SECTION_KEY,
      defaultValue: false,
    });

    const onShowAnalyzer = useCallback(
      () => openAnalyzer({ hit, renderCellActions, onAlertUpdated }),
      [openAnalyzer, hit, renderCellActions, onAlertUpdated]
    );

    const onShowSessionView = useCallback(
      () =>
        openSessionView({
          hit,
          jumpToCursor: sessionViewConfig?.jumpToCursor,
          jumpToEntityId: sessionViewConfig?.jumpToEntityId,
          renderCellActions,
          onAlertUpdated,
        }),
      [
        openSessionView,
        hit,
        onAlertUpdated,
        renderCellActions,
        sessionViewConfig?.jumpToCursor,
        sessionViewConfig?.jumpToEntityId,
      ]
    );

    const onShowGraph = useCallback(
      () => openDocumentGraph({ hit, renderCellActions, onAlertUpdated }),
      [openDocumentGraph, hit, renderCellActions, onAlertUpdated]
    );

    return (
      <ExpandableSection
        data-test-subj={VISUALIZATION_SECTION_TEST_ID}
        expanded={expanded}
        gutterSize="m"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={VISUALIZATION_SECTION_TITLE}
      >
        <SessionPreviewContainer
          disableNavigation={false}
          hit={hit}
          onShowSessionView={onShowSessionView}
          showIcon={false}
        />
        <AnalyzerPreviewContainer
          disableNavigation={false}
          hit={hit}
          onShowAnalyzer={onShowAnalyzer}
          shouldUseAncestor={false}
          showIcon={false}
        />
        {hasGraphData && (
          <GraphPreviewContainer hit={hit} onShowGraph={onShowGraph} showIcon={false} />
        )}
      </ExpandableSection>
    );
  }
);

VisualizationsSection.displayName = 'VisualizationsSection';
