/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi, useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux-v7';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { FLYOUT_STORAGE_KEYS } from '../../../../../flyout_v2/document/main/constants/local_storage';
import { useExpandSection } from '../../../../../flyout_v2/shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../../../flyout_v2/shared/components/expandable_section';
import {
  VISUALIZATION_SECTION_TEST_ID,
  VISUALIZATION_SECTION_TITLE,
} from '../../../../../flyout_v2/document/main/components/visualizations_section';
import { flyoutProviders } from '../../../../../flyout_v2/shared/components/flyout_provider';
import { useKibana } from '../../../../../common/lib/kibana';
import { useShouldShowGraph } from '../../../../shared/hooks/use_should_show_graph';
import { EntityDetailsLeftPanelTab, type EntityDetailsPath } from '../left_panel/left_panel_header';
import {
  ENTITY_GRAPH_PANEL_ARIA_LABEL,
  EntityGraphFlyoutContent,
  EntityGraphPanelKey,
  getEntityGraphFlyoutOptions,
} from '../entity_graph_panel';
import { EntityGraphPreviewContainer } from './entity_graph_preview_container';

const KEY = 'visualizations';

/**
 * Visualizations section in overview.
 *
 * Prefer the caller's `openDetailsPanel` (v2 Host/User → `openEntityGraphView`) when provided.
 * Otherwise open a standalone system flyout with {@link EntityGraphFlyoutContent} (legacy /
 * surfaces that do not wire GRAPH_VIEW).
 */
export const VisualizationsSection = memo(
  ({
    entityId,
    isPreviewMode,
    scopeId,
    openDetailsPanel,
    originRiskScore,
  }: {
    entityId: string;
    isPreviewMode: boolean;
    scopeId: string;
    /** When set (v2 entity flyout), opens the native graph tool via GRAPH_VIEW. */
    openDetailsPanel?: (path: EntityDetailsPath) => void;
    /**
     * Flyout Entity risk (`calculated_score_norm`).
     * `null` = Unknown — preview origin badge must match (not mock Critical).
     */
    originRiskScore?: number | null;
  }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const { closeLeftPanel, closePreviewPanel } = useExpandableFlyoutApi();
    const { left } = useExpandableFlyoutState();
    const graphFlyoutRef = useRef<OverlayRef | null>(null);

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: KEY,
      // Default open so Graph preview is visible when reviewing entity flyouts locally.
      defaultValue: true,
    });
    const shouldShowGraph = useShouldShowGraph();

    // Clear any leftover left/preview graph panels from older navigation / URLs.
    useEffect(() => {
      const tab = (left?.params as { path?: { tab?: string } } | undefined)?.path?.tab;
      if (
        left?.id === EntityGraphPanelKey ||
        (left != null && tab === EntityDetailsLeftPanelTab.GRAPH_VIEW)
      ) {
        closeLeftPanel();
      }
    }, [closeLeftPanel, left, left?.id, left?.params]);

    useEffect(() => {
      return () => {
        graphFlyoutRef.current?.close();
        graphFlyoutRef.current = null;
      };
    }, []);

    const handleOpenGraphView = useCallback(() => {
      // Prefer the v2 entity flyout graph tool (openEntityGraphView) when the parent wires it.
      if (openDetailsPanel) {
        openDetailsPanel({ tab: EntityDetailsLeftPanelTab.GRAPH_VIEW });
        return;
      }

      // Fallback: standalone system flyout (legacy expandable-flyout callers).
      closeLeftPanel();
      closePreviewPanel();
      graphFlyoutRef.current?.close();

      const flyoutRef = overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <EntityGraphFlyoutContent
              entityId={entityId}
              scopeId={scopeId}
              onBack={() => {
                flyoutRef.close();
                graphFlyoutRef.current = null;
              }}
            />
          ),
        }),
        {
          ...getEntityGraphFlyoutOptions(),
          'aria-label': ENTITY_GRAPH_PANEL_ARIA_LABEL,
          onClose: (ref) => {
            ref.close();
            graphFlyoutRef.current = null;
          },
        }
      );
      graphFlyoutRef.current = flyoutRef;
    }, [
      closeLeftPanel,
      closePreviewPanel,
      entityId,
      history,
      openDetailsPanel,
      overlays,
      scopeId,
      services,
      store,
    ]);

    if (!shouldShowGraph) {
      return null;
    }

    return (
      <ExpandableSection
        expanded={expanded}
        title={VISUALIZATION_SECTION_TITLE}
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={KEY}
        data-test-subj={VISUALIZATION_SECTION_TEST_ID}
      >
        <EntityGraphPreviewContainer
          entityId={entityId}
          showIcon={false}
          disableNavigation={isPreviewMode || scopeId === TableId.rulePreview}
          onShowGraph={handleOpenGraphView}
          originRiskScore={originRiskScore}
        />
      </ExpandableSection>
    );
  }
);

VisualizationsSection.displayName = 'VisualizationsSection';
