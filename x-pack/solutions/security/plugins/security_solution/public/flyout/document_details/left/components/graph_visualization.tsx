/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/css';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useGetScopedSourcererDataView } from '../../../../sourcerer/components/use_get_sourcerer_data_view';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_ID = 'graph-visualization' as const;

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphVisualization: React.FC = memo(() => {
  const dataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.default,
  });
  const { getFieldsData, dataAsNestedObject, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();
  const {
    eventIds,
    timestamp = new Date().toISOString(),
    isAlert,
  } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  const originEventIds = eventIds.map((id) => ({ id, isAlert }));

  return (
    <div
      data-test-subj={GRAPH_VISUALIZATION_TEST_ID}
      css={css`
        height: calc(100vh - 250px);
        min-height: 400px;
        width: 100%;
      `}
    >
      {dataView && (
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <GraphInvestigationLazy
            initialState={{
              dataView,
              originEventIds,
              timeRange: {
                from: `${timestamp}||-30m`,
                to: `${timestamp}||+30m`,
              },
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
