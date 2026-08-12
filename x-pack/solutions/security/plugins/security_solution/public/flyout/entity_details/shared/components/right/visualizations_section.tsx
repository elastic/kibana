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
import { useStore } from 'react-redux';
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
 * Clicking the graph preview opens a resizable system flyout (wider than the entity flyout).
 * Back closes it and returns to the entity-only flyout — no left/right side-by-side.
 */
export const VisualizationsSection = memo(
  ({
    entityId,
    isPreviewMode,
    scopeId,
  }: {
    entityId: string;
    isPreviewMode: boolean;
    scopeId: string;
    /** @deprecated Kept for call-site compatibility; graph opens a system flyout instead. */
    openDetailsPanel?: (path: EntityDetailsPath) => void;
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
      // Never open expandable left/preview side-by-side for graph.
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
          showIcon={true}
          disableNavigation={isPreviewMode || scopeId === TableId.rulePreview}
          onShowGraph={handleOpenGraphView}
        />
      </ExpandableSection>
    );
  }
);

VisualizationsSection.displayName = 'VisualizationsSection';
