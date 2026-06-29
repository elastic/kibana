/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import {
  GRAPH_SCOPE_ID,
  GraphGroupedNodePreviewPanel,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { EventKind } from '../../main/constants/event_kinds';
import { GraphVisualization } from './components/graph_visualization';
import { useGraphPreview } from '../../main/hooks/use_graph_preview';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../../main/document_flyout_wrapper';
import { useDefaultDocumentFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { Network } from '../../../network/main';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { HostPanel } from '../../../../flyout/entity_details/host_right';
import { UserPanel } from '../../../../flyout/entity_details/user_right';
import { ServicePanel } from '../../../../flyout/entity_details/service_right';
import { GenericEntityPanel } from '../../../../flyout/entity_details/generic_right';

export const GRAPH_TOOLS_TEST_ID = `${PREFIX}GraphTools` as const;

const TITLE = i18n.translate('xpack.securitySolution.flyout.graph.title', {
  defaultMessage: 'Graph',
});

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

    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const onShowDocument = useCallback(
      (documentId: string, indexName?: string) =>
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <DocumentFlyoutWrapper
                documentId={documentId}
                indexName={indexName}
                renderCellActions={renderCellActions}
                onAlertUpdated={onAlertUpdated}
              />
            ),
          }),
          {
            ...defaultFlyoutProperties,
            historyKey,
            session: 'inherit',
          }
        ),
      [
        defaultFlyoutProperties,
        history,
        historyKey,
        onAlertUpdated,
        overlays,
        renderCellActions,
        services,
        store,
      ]
    );

    const onShowNetwork = useCallback(
      (ip: string) =>
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: <Network ip={ip} flowTarget={FlowTargetSourceDest.source} />,
          }),
          { ...defaultFlyoutProperties, historyKey, session: 'inherit' }
        ),
      [defaultFlyoutProperties, history, historyKey, overlays, services, store]
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
      }) => {
        let child: React.ReactNode;
        if (engineType === 'host') {
          child = (
            <HostPanel
              contextID={GRAPH_SCOPE_ID}
              scopeId={GRAPH_SCOPE_ID}
              hostName={entityName ?? ''}
              entityId={entityId}
              isPreviewMode
            />
          );
        } else if (engineType === 'user') {
          child = (
            <UserPanel
              contextID={GRAPH_SCOPE_ID}
              scopeId={GRAPH_SCOPE_ID}
              userName={entityName ?? ''}
              entityId={entityId}
              isPreviewMode
            />
          );
        } else if (engineType === 'service') {
          child = (
            <ServicePanel
              contextID={GRAPH_SCOPE_ID}
              scopeId={GRAPH_SCOPE_ID}
              serviceName={entityName ?? ''}
              entityId={entityId}
              isPreviewMode
            />
          );
        } else {
          child = <GenericEntityPanel scopeId={GRAPH_SCOPE_ID} entityId={entityId} isPreviewMode />;
        }

        overlays.openSystemFlyout(flyoutProviders({ services, store, history, children: child }), {
          ...defaultFlyoutProperties,
          historyKey,
          session: 'inherit',
        });
      },
      [defaultFlyoutProperties, history, historyKey, overlays, services, store]
    );

    const onShowGrouped = useCallback(
      (
        params: Omit<
          GraphGroupedNodePreviewPanelProps,
          'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
        >
      ) =>
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <GraphGroupedNodePreviewPanel
                {...params}
                scopeId={GRAPH_SCOPE_ID}
                onShowDocument={onShowDocument}
                onShowEntity={onShowEntity}
              />
            ),
          }),
          { ...defaultFlyoutProperties, historyKey, session: 'inherit' }
        ),
      [
        defaultFlyoutProperties,
        history,
        historyKey,
        onShowDocument,
        onShowEntity,
        overlays,
        services,
        store,
      ]
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
            title={TITLE}
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
