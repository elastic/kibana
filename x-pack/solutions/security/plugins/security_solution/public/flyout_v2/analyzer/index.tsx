/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { PREFIX } from '../../flyout/shared/test_ids';
import { PageScope } from '../../data_view_manager/constants';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useTimelineDataFilters } from '../../timelines/containers/use_timeline_data_filters';
import { Resolver } from '../../resolver/view';
import type { ResolverCellActionRenderer } from '../../resolver/types';

export const ANALYZER_GRAPH_TEST_ID = `${PREFIX}AnalyzerGraph` as const;

export interface AnalyzerGraphProps {
  /**
   * The document record that will be used to render the content of the analyzer graph.
   */
  hit: DataTableRecord;
  /**
   * A function that renders cell actions for the analyzer graph.
   */
  renderCellActions: ResolverCellActionRenderer;
}

const RESOLVER_COMPONENT_INSTANCE_ID = 'flyout_v2_analyzer_graph';

/**
 * Analyzer graph view displayed in the analyzer tools flyout
 */
export const AnalyzerGraph = memo(({ hit, renderCellActions }: AnalyzerGraphProps) => {
  const eventId = hit.raw._id ?? '';

  const { from, to, shouldUpdate } = useTimelineDataFilters(false);
  const filters = useMemo(() => ({ from, to }), [from, to]);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(PageScope.analyzer);
  const experimentalAnalyzerPatterns = useSelectedPatterns(PageScope.analyzer);
  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalAnalyzerPatterns
    : oldAnalyzerPatterns;

  if (!eventId) {
    return null;
  }

  return (
    <div data-test-subj={ANALYZER_GRAPH_TEST_ID}>
      <Resolver
        databaseDocumentID={eventId}
        resolverComponentInstanceID={RESOLVER_COMPONENT_INSTANCE_ID}
        indices={selectedPatterns}
        shouldUpdate={shouldUpdate}
        filters={filters}
        renderCellActions={renderCellActions}
      />
    </div>
  );
});

AnalyzerGraph.displayName = 'AnalyzerGraph';
