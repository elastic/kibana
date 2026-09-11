/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, Suspense } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getFieldValue, type DataTableRecord } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { GraphVisualization } from '../../../../flyout/shared/components/graph_visualization';
import { DEFAULT_GRAPH_PROTOTYPE_VERSION } from '../../../../flyout/shared/components/graph_prototype_version';
import type { GraphPrototypeVersion } from '../../../../flyout/shared/components/graph_prototype_version';
import { GraphPrototypeVersionSelector } from '../../../../flyout/shared/components/graph_prototype_version_selector';
import { useGraphPreview } from '../../main/hooks/use_graph_preview';
import { EventKind } from '../../main/constants/event_kinds';

export const GRAPH_VIEW_TEST_ID = `${PREFIX}GraphView` as const;

export interface GraphViewProps {
  hit: DataTableRecord;
  renderCellActions: CellActionRenderer;
  onAlertUpdated: () => void;
}

const TITLE = i18n.translate('xpack.securitySolution.flyout.graphView.title', {
  defaultMessage: 'Graph view',
});

/**
 * Full graph investigation opened from the alert/event flyout Visualizations preview.
 */
export const GraphView = memo(({ hit, renderCellActions, onAlertUpdated }: GraphViewProps) => {
  const { euiTheme } = useEuiTheme();
  const { eventIds, timestamp } = useGraphPreview({ hit });
  const [prototypeVersion, setPrototypeVersion] = useState<GraphPrototypeVersion>(
    DEFAULT_GRAPH_PROTOTYPE_VERSION
  );
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  if (!timestamp || eventIds.length === 0) {
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
          titleExtra={
            <GraphPrototypeVersionSelector
              value={prototypeVersion}
              onChange={setPrototypeVersion}
            />
          }
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
        `}
      >
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>
          <div
            data-test-subj={GRAPH_VIEW_TEST_ID}
            css={css`
              flex: 1;
              min-height: 480px;
              height: 100%;
            `}
          >
            <GraphVisualization
              mode="event"
              scopeId={TableId.alertsOnAlertsPage}
              eventIds={eventIds}
              timestamp={timestamp}
              isAlert={isAlert}
              prototypeVersion={prototypeVersion}
            />
          </div>
        </Suspense>
      </EuiFlyoutBody>
    </>
  );
});

GraphView.displayName = 'GraphView';
