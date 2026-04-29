/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useNavigateToGraphVisualization } from '../../shared/hooks/use_navigate_to_graph_visualization';
import { GraphPreviewContainer as SharedGraphPreviewContainer } from '../../../shared/components/graph_preview_container';

export const GraphPreviewContainer: React.FC = () => {
  const {
    dataAsNestedObject,
    getFieldsData,
    eventId,
    indexName,
    scopeId,
    isRulePreview,
    isPreviewMode,
    dataFormattedForFieldBrowser,
  } = useDocumentDetailsContext();

  const { navigateToGraphVisualization } = useNavigateToGraphVisualization({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
  });

  const allowFlyoutExpansion = !isPreviewMode && !isRulePreview;

  const { eventIds, timestamp, shouldShowGraph, isAlert } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  return (
    <SharedGraphPreviewContainer
      mode="event"
      shouldShowGraph={shouldShowGraph}
      isAlert={isAlert}
      timestamp={timestamp ?? new Date().toISOString()}
      eventIds={eventIds}
      indexName={indexName}
      isPreviewMode={isPreviewMode}
      isRulePreview={isRulePreview}
      onExpandGraph={allowFlyoutExpansion ? navigateToGraphVisualization : undefined}
    />
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
