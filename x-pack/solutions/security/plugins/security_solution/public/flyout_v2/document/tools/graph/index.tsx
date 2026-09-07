/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import {
  GRAPH_SCOPE_ID,
  GraphGroupedNodePreviewPanel,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { GRAPH_TITLE } from '../../../shared/constants/flyout_titles';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { EventKind } from '../../main/constants/event_kinds';
import { GraphVisualization } from './components/graph_visualization';
import { useGraphPreview } from '../../main/hooks/use_graph_preview';
import { useOpenFlyout } from '../../../shared/hooks/use_open_flyout';
import { useFlyoutApi } from '../../../use_flyout_api';
import { useDefaultDocumentFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { useFlyoutSessionContext } from '../../../session_context';
import {
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
  FLYOUT_TYPE,
} from '../../../../common/lib/telemetry';

export const GRAPH_TOOLS_TEST_ID = `${PREFIX}GraphTools` as const;

export interface GraphDetailsProps {
  hit: DataTableRecord;
  renderCellActions: CellActionRenderer;
  onAlertUpdated: () => void;
}

export const GraphDetails = memo(
  ({ hit, renderCellActions, onAlertUpdated }: GraphDetailsProps) => {
    const { euiTheme } = useEuiTheme();
    const eventId = hit.raw._id ?? '';
    const { timestamp, eventIds } = useGraphPreview({ hit });
    const isAlert = (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal;

    const open = useOpenFlyout();
    const { historyKey } = useFlyoutSessionContext();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const {
      openDocumentFlyoutFromIndexAsChild,
      openNetworkFlyoutAsChild,
      openEntityDetailsAsChild,
    } = useFlyoutApi();

    const onShowDocument = useCallback(
      (documentId: string, indexName?: string) =>
        openDocumentFlyoutFromIndexAsChild({
          documentId,
          indexName,
          renderCellActions,
          onAlertUpdated,
          origin: FLYOUT_ORIGIN.GRAPH_DOCUMENT_NODE,
        }),
      [openDocumentFlyoutFromIndexAsChild, renderCellActions, onAlertUpdated]
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

    const onShowEntity = useCallback(
      ({
        engineType,
        entityId,
        entityName,
      }: {
        engineType: string | undefined;
        entityId: string;
        entityName: string | undefined;
      }) => openEntityDetailsAsChild({ engineType, entityId, entityName, scopeId: GRAPH_SCOPE_ID }),
      [openEntityDetailsAsChild]
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
            scopeId={GRAPH_SCOPE_ID}
            onShowDocument={onShowDocument}
            onShowEntity={onShowEntity}
          />,
          { ...defaultFlyoutProperties, historyKey, session: FLYOUT_SESSION_KIND.INHERIT },
          {
            surface: FLYOUT_SURFACE.TOOL,
            tool: FLYOUT_TOOL.GRAPH,
            flyoutType: FLYOUT_TYPE.DOCUMENT,
            session: FLYOUT_SESSION_KIND.INHERIT,
            origin: FLYOUT_ORIGIN.GRAPH_GROUPED_NODE,
          },
          'inherit'
        ),
      [defaultFlyoutProperties, historyKey, onShowDocument, onShowEntity, open]
    );

    if (!eventId || !timestamp) {
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
          <DocumentToolsFlyoutHeader
            hit={hit}
            title={GRAPH_TITLE}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <div data-test-subj={GRAPH_TOOLS_TEST_ID}>
            <GraphVisualization
              mode="event"
              scopeId={GRAPH_SCOPE_ID}
              eventIds={eventIds}
              timestamp={timestamp}
              isAlert={isAlert}
              onShowDocument={onShowDocument}
              onShowEntity={onShowEntity}
              onShowNetwork={onShowNetwork}
              onShowGrouped={onShowGrouped}
            />
          </div>
        </EuiFlyoutBody>
      </>
    );
  }
);

GraphDetails.displayName = 'GraphDetails';
