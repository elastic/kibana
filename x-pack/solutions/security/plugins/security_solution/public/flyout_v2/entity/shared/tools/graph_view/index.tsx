/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { noop } from 'lodash/fp';
import {
  GraphGroupedNodePreviewPanel,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { FlowTargetSourceDest } from '../../../../../../common/search_strategy';
import { useDefaultDocumentFlyoutProperties } from '../../../../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../../../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../../../../shared/utils/build_flyout_nav_title';
import {
  ENTITIES_TITLE,
  ENTITY_GRAPH_VIEW_TITLE,
  EVENT_TITLE,
} from '../../../../shared/constants/flyout_titles';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { GraphVisualization } from '../../../../document/tools/graph/components/graph_visualization';
import { useFlyoutSessionContext } from '../../../../session_context';
import {
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
} from '../../../../../common/lib/telemetry';

const TITLE = ENTITY_GRAPH_VIEW_TITLE;

export interface GraphViewProps {
  /** Entity Store v2 id (`entity.id`) to center the graph on. */
  entityId: string;
  /** Scope id for the graph and the flyouts it opens. */
  scopeId: string;
  /** Display name of the originating entity (shown in the tool header). */
  entityName: string;
  /** Opens an entity flyout when an entity node is clicked. */
  onShowEntity: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
  /** Opens the originating entity flyout as a child (via the header title button). */
  onShowOriginatingEntity?: () => void;
}

/**
 * Tool flyout rendering the shared {@link GraphVisualization} centered on an entity. Node clicks
 * open documents / networks / grouped nodes / entities as separate system flyouts via
 * `overlays.openSystemFlyout` instead of the legacy expandable flyout API.
 */
export const GraphView = memo(
  ({ entityId, scopeId, entityName, onShowEntity, onShowOriginatingEntity }: GraphViewProps) => {
    const open = useOpenFlyout();
    const { historyKey } = useFlyoutSessionContext();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const { openDocumentFlyoutFromIndexAsChild, openNetworkFlyoutAsChild } = useFlyoutApi();

    const onShowDocument = useCallback(
      (documentId: string, indexName?: string, isEvent?: boolean) =>
        openDocumentFlyoutFromIndexAsChild({
          documentId,
          indexName,
          renderCellActions: cellActionRenderer,
          onAlertUpdated: noop,
          origin: FLYOUT_ORIGIN.GRAPH_DOCUMENT_NODE,
          title: isEvent ? EVENT_TITLE : undefined,
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

    const onShowGrouped = useCallback(
      (
        params: Omit<
          GraphGroupedNodePreviewPanelProps,
          'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
        >
      ) =>
        open(
          <GraphGroupedNodePreviewPanel
            {...params}
            scopeId={scopeId}
            onShowDocument={onShowDocument}
            onShowEntity={onShowEntity}
          />,
          {
            ...defaultFlyoutProperties,
            historyKey,
            session: FLYOUT_SESSION_KIND.INHERIT,
            title: buildFlyoutNavTitle(
              params.docMode === 'grouped-entities' ? ENTITIES_TITLE : EVENT_TITLE
            ),
          },
          {
            surface: FLYOUT_SURFACE.TOOL,
            tool: FLYOUT_TOOL.GRAPH_VIEW,
            session: FLYOUT_SESSION_KIND.INHERIT,
            origin: FLYOUT_ORIGIN.GRAPH_GROUPED_NODE,
          },
          FLYOUT_SESSION_KIND.INHERIT
        ),
      [scopeId, onShowDocument, onShowEntity, defaultFlyoutProperties, historyKey, open]
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onShowOriginatingEntity}
            label={entityName}
            iconType="graphApp"
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <GraphVisualization
            mode="entity"
            scopeId={scopeId}
            entityId={entityId}
            onShowDocument={onShowDocument}
            onShowEntity={onShowEntity}
            onShowNetwork={onShowNetwork}
            onShowGrouped={onShowGrouped}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

GraphView.displayName = 'GraphView';
