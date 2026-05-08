/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { PREFIX } from '../../flyout/shared/test_ids';
import { GraphVisualization as SharedGraphVisualization } from '../../flyout/shared/components/graph_visualization';
import { useGraphPreview } from '../document/hooks/use_graph_preview';

export const GRAPH_TEST_ID = `${PREFIX}Graph` as const;

const SCOPE_ID = 'flyout_v2_graph';

const TITLE = i18n.translate('xpack.securitySolution.flyout.graph.title', {
  defaultMessage: 'Graph',
});

export interface GraphProps {
  /**
   * The document record that drives the graph visualization.
   */
  hit: DataTableRecord;
  /**
   * Renderer used by the graph header for field cell actions.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated: () => void;
}

/**
 * Graph tools flyout. Renders the shared graph investigation view in 'event' mode,
 * deriving its parameters from the document `hit`.
 */
export const Graph = memo(({ hit, renderCellActions, onAlertUpdated }: GraphProps) => {
  const { euiTheme } = useEuiTheme();
  const { eventIds, timestamp, isAlert } = useGraphPreview(hit);

  if (eventIds.length === 0 || !timestamp) {
    return null;
  }

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <ToolsFlyoutHeader
          hit={hit}
          title={TITLE}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div data-test-subj={GRAPH_TEST_ID}>
          <SharedGraphVisualization
            mode="event"
            scopeId={SCOPE_ID}
            eventIds={eventIds}
            timestamp={timestamp}
            isAlert={isAlert}
          />
        </div>
      </EuiFlyoutBody>
    </>
  );
});

Graph.displayName = 'Graph';
