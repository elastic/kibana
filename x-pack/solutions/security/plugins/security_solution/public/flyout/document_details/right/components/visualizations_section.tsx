/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { FLYOUT_STORAGE_KEYS } from '../../../../flyout_v2/document/main/constants/local_storage';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { AnalyzerPreviewContainer } from '../../../../flyout_v2/document/main/components/analyzer_preview_container';
import { SessionPreviewContainer } from '../../../../flyout_v2/document/main/components/session_preview_container';
import { GraphPreviewContainer } from '../../../../flyout_v2/document/main/components/graph_preview_container';
import { ExpandableSection } from '../../../../flyout_v2/shared/components/expandable_section';
import { useGraphPreview } from '../../../../flyout_v2/document/main/hooks/use_graph_preview';
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToAnalyzer } from '../../shared/hooks/use_navigate_to_analyzer';
import { useNavigateToSessionView } from '../../shared/hooks/use_navigate_to_session_view';
import { useNavigateToGraphVisualization } from '../../shared/hooks/use_navigate_to_graph_visualization';
import {
  VISUALIZATION_SECTION_TEST_ID,
  VISUALIZATION_SECTION_TITLE,
} from '../../../../flyout_v2/document/main/components/visualizations_section';

const KEY = 'visualizations';

/**
 * Visualizations section in overview. It contains analyzer preview and session view preview.
 */
export const VisualizationsSection = memo(() => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });
  const { isRulePreview, eventId, indexName, scopeId, isPreviewMode, searchHit } =
    useDocumentDetailsContext();

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  // Decide whether to show the graph preview or not
  const { hasGraphData } = useGraphPreview({ hit });

  const { navigateToAnalyzer } = useNavigateToAnalyzer({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
    isPreviewMode,
  });
  const { navigateToSessionView } = useNavigateToSessionView({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
    isPreviewMode,
  });
  const { navigateToGraphVisualization } = useNavigateToGraphVisualization({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
  });

  return (
    <ExpandableSection
      expanded={expanded}
      title={VISUALIZATION_SECTION_TITLE}
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      data-test-subj={VISUALIZATION_SECTION_TEST_ID}
    >
      <SessionPreviewContainer
        hit={hit}
        disableNavigation={isRulePreview}
        showIcon={!isPreviewMode}
        onShowSessionView={navigateToSessionView}
      />
      <EuiSpacer />
      <AnalyzerPreviewContainer
        hit={hit}
        onShowAnalyzer={navigateToAnalyzer}
        shouldUseAncestor={isRulePreview}
        showIcon={!isPreviewMode}
        disableNavigation={isRulePreview}
      />
      {hasGraphData && (
        <>
          <EuiSpacer />
          <GraphPreviewContainer
            hit={hit}
            onShowGraph={navigateToGraphVisualization}
            disableNavigation={isRulePreview}
            showIcon={!isPreviewMode}
          />
        </>
      )}
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
