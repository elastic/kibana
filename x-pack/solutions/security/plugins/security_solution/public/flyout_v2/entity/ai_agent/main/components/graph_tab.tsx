/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { GraphVisualization } from '../../../../document/tools/graph/components/graph_visualization';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { FlowTargetSourceDest } from '../../../../../../common/search_strategy';
import { FLYOUT_ORIGIN, FLYOUT_TYPE } from '../../../../../common/lib/telemetry';
import { getGraphEntryPoint } from '../../../../shared/utils/get_graph_entry_point';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import { GRAPH_OPEN_FULL, TAB_GRAPH } from '../translations';

export interface GraphTabProps {
  readonly entityId: string;
  readonly entityName: string;
  readonly scopeId: string;
  readonly onShowAgent: () => void;
}

/**
 * The existing graph investigation, centred on the agent. In entity mode it draws the
 * relationships graph: the host (`depends_on`), the local user (`owns_inferred`) and the person
 * (`acts_on_behalf_of`), each opening its own flyout.
 */
export const GraphTab = memo(({ entityId, entityName, scopeId, onShowAgent }: GraphTabProps) => {
  const {
    openEntityDetailsAsChild,
    openDocumentFlyoutFromIndexAsChild,
    openNetworkFlyoutAsChild,
    openEntityGraphView,
  } = useFlyoutApi();
  const entryPoint = getGraphEntryPoint({ mode: 'entity' });

  const onShowEntity = useCallback(
    (params: {
      engineType: string | undefined;
      entityId: string;
      entityName: string | undefined;
    }) => openEntityDetailsAsChild({ ...params, scopeId, origin: FLYOUT_ORIGIN.GRAPH_NODE }),
    [openEntityDetailsAsChild, scopeId]
  );
  const onShowDocument = useCallback(
    (documentId: string, indexName?: string) =>
      openDocumentFlyoutFromIndexAsChild({
        documentId,
        indexName,
        renderCellActions: cellActionRenderer,
        onAlertUpdated: noop,
        origin: FLYOUT_ORIGIN.GRAPH_DOCUMENT_NODE,
      }),
    [openDocumentFlyoutFromIndexAsChild]
  );
  const onShowNetwork = useCallback(
    (ip: string) =>
      openNetworkFlyoutAsChild({
        ip,
        flowTarget: FlowTargetSourceDest.source,
        origin: FLYOUT_ORIGIN.GRAPH_NETWORK_NODE,
      }),
    [openNetworkFlyoutAsChild]
  );
  const onOpenFullGraph = useCallback(
    () =>
      openEntityGraphView({
        entityId,
        scopeId,
        entityName,
        onShowEntity,
        onShowOriginatingEntity: onShowAgent,
        flyoutType: FLYOUT_TYPE.GENERIC,
        origin: FLYOUT_ORIGIN.VISUALIZATIONS_GRAPH,
        entryPoint,
      }),
    [openEntityGraphView, entityId, scopeId, entityName, onShowEntity, onShowAgent, entryPoint]
  );

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.graph}>
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="xs" iconType="graphApp" onClick={onOpenFullGraph}>
            {GRAPH_OPEN_FULL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <KibanaSectionErrorBoundary sectionName={TAB_GRAPH}>
        <GraphVisualization
          mode="entity"
          scopeId={scopeId}
          entityId={entityId}
          entryPoint={entryPoint}
          onShowDocument={onShowDocument}
          onShowEntity={onShowEntity}
          onShowNetwork={onShowNetwork}
          onShowGrouped={noop}
        />
      </KibanaSectionErrorBoundary>
    </div>
  );
});
GraphTab.displayName = 'GraphTab';
