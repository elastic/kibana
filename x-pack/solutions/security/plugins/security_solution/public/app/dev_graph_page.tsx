/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DEV / PR preview only — remove this page and its route before merging to main.
 *
 * Navigate to: /app/security/dev-graph
 *
 * Mock data uses scenarioComplexPreview (see use_fetch_graph_data.ts).
 *
 * Layout (Tab A only — hover actions + risk-colored entities):
 * - Entity Analytics–like page in the background
 * - Flyout fixed on the LEFT (product structure; side mirrored for this preview)
 * - Entity flyout → open Graph → Back returns to entity flyout
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { useKibana } from '../common/lib/kibana';
import { GraphPreviewPanel } from '../flyout_v2/shared/components/graph_preview_panel';
import { FlyoutTitle } from '../flyout_v2/shared/components/flyout_title';

const TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
};

const ORIGIN_ENTITY_ID = 'john.doe';
const ORIGIN_ENTITY_NAME = 'macbook-john-work';
const ORIGIN_ENTITY_IDS = [{ id: ORIGIN_ENTITY_ID, isOrigin: true }];

const ORIGIN_EVENT_IDS = [
  { id: 'dev-event-1', isAlert: true },
  { id: 'dev-event-2', isAlert: false },
];

/** Keep the KQL bar closed by default on this preview page. */
const TOGGLE_SEARCH_BAR_STORAGE_KEY =
  'securitySolution.graphInvestigation:toggleSearchBarState' as const;

type FlyoutView = 'entity' | 'graph';

const FullGraph = ({
  dataView,
  entityActionsMode,
  entityStyleMode = 'default',
}: {
  dataView: DataView;
  entityActionsMode: 'button' | 'hover';
  entityStyleMode?: 'default' | 'colored';
}) => (
  <GraphInvestigation
    scopeId="dev-graph-preview"
    initialState={{
      dataView,
      originEventIds: ORIGIN_EVENT_IDS,
      entityIds: ORIGIN_ENTITY_IDS,
      timeRange: TIME_RANGE,
    }}
    showToggleSearch={true}
    showInvestigateInTimeline={true}
    searchControlsVariant="unified"
    entityActionsMode={entityActionsMode}
    entityStyleMode={entityStyleMode}
    // Enables relationships + details actions in the expand/hover menus for local preview.
    onOpenEventPreview={() => undefined}
  />
);

/** Dimmed Entity Analytics–like page behind the flyout (structure only). */
const EntityAnalyticsBackdrop = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        height: 100%;
        padding: ${euiTheme.size.l};
        background: ${euiTheme.colors.backgroundBasePlain};
        opacity: 0.55;
        pointer-events: none;
        user-select: none;
      `}
      aria-hidden={true}
    >
      <EuiTitle size="s">
        <h2>Entity analytics</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true} paddingSize="m" color="subdued">
        <EuiText size="s" color="subdued">
          Filter your data using KQL syntax
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>Entities</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} paddingSize="s">
        <EuiText size="s">
          <strong>{ORIGIN_ENTITY_NAME}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          Host · {ORIGIN_ENTITY_ID}
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} paddingSize="s">
        <EuiText size="s" color="subdued">
          admin-pc
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} paddingSize="s">
        <EuiText size="s" color="subdued">
          john-pc-home
        </EuiText>
      </EuiPanel>
    </div>
  );
};

/** Entity flyout content with Graph preview (opens full graph). */
const EntityFlyoutContent = ({
  onShowGraph,
  onClose,
}: {
  onShowGraph: () => void;
  onClose: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { isLoading, isError, data } = useFetchGraphData({
    req: {
      query: {
        entityIds: ORIGIN_ENTITY_IDS,
        start: 'now-30d',
        end: 'now',
      },
    },
    options: {
      enabled: true,
      refetchOnWindowFocus: false,
    },
  });

  return (
    <>
      <div
        css={css`
          padding: ${euiTheme.size.base};
          border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: ${euiTheme.size.s};
        `}
      >
        <div css={{ minWidth: 0 }}>
          <FlyoutTitle title={ORIGIN_ENTITY_NAME} iconType="storage" />
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">Host</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">Entity Store</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">Risk: Critical</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <EuiButtonEmpty size="xs" iconType="cross" aria-label="Close flyout" onClick={onClose} />
      </div>

      <div
        css={css`
          flex: 1;
          overflow: auto;
          padding: ${euiTheme.size.base};
        `}
      >
        <EuiTitle size="xxs">
          <h3>Visualizations</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none">
          <GraphPreviewPanel
            shouldShowGraph={true}
            isLoading={isLoading}
            isError={isError}
            data={data}
            showIcon={true}
            disableNavigation={false}
            onShowGraph={onShowGraph}
          />
        </EuiPanel>
        <EuiHorizontalRule margin="m" />
        <EuiText size="s" color="subdued">
          Open Graph view to expand the full graph. Back returns to this entity flyout.
        </EuiText>
      </div>
    </>
  );
};

/** Full graph panel with Back → entity flyout (structure from expandable flyout). */
const GraphFlyoutContent = ({
  dataView,
  entityActionsMode,
  entityStyleMode,
  onBack,
  onClose,
}: {
  dataView: DataView;
  entityActionsMode: 'button' | 'hover';
  entityStyleMode: 'default' | 'colored';
  onBack: () => void;
  onClose: () => void;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.base};
          border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${euiTheme.size.s};
          flex-shrink: 0;
        `}
      >
        <EuiButtonEmpty size="s" iconType="arrowLeft" flush="left" onClick={onBack}>
          Back
        </EuiButtonEmpty>
        <EuiButtonEmpty size="xs" iconType="cross" aria-label="Close flyout" onClick={onClose} />
      </div>
      <div
        css={css`
          padding: 0 ${euiTheme.size.base} ${euiTheme.size.s};
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: ${euiTheme.size.m};
          flex-shrink: 0;
        `}
      >
        <EuiTitle size="s">
          <h2>Graph</h2>
        </EuiTitle>
        <EuiText size="s" color="primary">
          {ORIGIN_ENTITY_NAME}
        </EuiText>
      </div>
      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow: hidden;
        `}
      >
        <FullGraph
          dataView={dataView}
          entityActionsMode={entityActionsMode}
          entityStyleMode={entityStyleMode}
        />
      </div>
    </>
  );
};

/**
 * Fixed left flyout over Entity Analytics backdrop.
 * Entity details ↔ Graph (Back), matching the product flow.
 */
const DevGraphWithFlyout = ({
  dataView,
  entityActionsMode,
  entityStyleMode,
}: {
  dataView: DataView;
  entityActionsMode: 'button' | 'hover';
  entityStyleMode: 'default' | 'colored';
}) => {
  const { euiTheme } = useEuiTheme();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(true);
  const [view, setView] = useState<FlyoutView>('entity');

  const closeFlyout = () => {
    setIsFlyoutOpen(false);
    setView('entity');
  };

  return (
    <div
      css={css`
        position: relative;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      `}
    >
      <EntityAnalyticsBackdrop />

      {!isFlyoutOpen && (
        <div
          css={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          `}
        >
          <EuiButton
            onClick={() => {
              setIsFlyoutOpen(true);
              setView('entity');
            }}
          >
            Open entity flyout
          </EuiButton>
        </div>
      )}

      {isFlyoutOpen && (
        <div
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: ${view === 'graph' ? 'min(72%, 960px)' : '420px'};
            max-width: 100%;
            z-index: 3;
            display: flex;
            flex-direction: column;
            background: ${euiTheme.colors.backgroundBasePlain};
            border-right: 1px solid ${euiTheme.colors.borderBaseSubdued};
            box-shadow: ${euiTheme.shadows.l};
            overflow: hidden;
            transition: width 160ms ease;
          `}
        >
          {view === 'entity' ? (
            <EntityFlyoutContent onShowGraph={() => setView('graph')} onClose={closeFlyout} />
          ) : (
            <GraphFlyoutContent
              dataView={dataView}
              entityActionsMode={entityActionsMode}
              entityStyleMode={entityStyleMode}
              onBack={() => setView('entity')}
              onClose={closeFlyout}
            />
          )}
        </div>
      )}
    </div>
  );
};

export const DevGraphPage = () => {
  const { dataViews } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(TOGGLE_SEARCH_BAR_STORAGE_KEY, JSON.stringify(false));
    } catch {
      // Ignore storage failures in local preview.
    }
  }, []);

  useEffect(() => {
    dataViews
      .getDefaultDataView()
      .then((dv) => {
        if (dv) {
          setDataView(dv);
        } else {
          dataViews
            .create({ title: '.alerts-*', timeFieldName: '@timestamp' })
            .then(setDataView)
            .catch(() => setError('Could not create data view'));
        }
      })
      .catch(() => setError('Could not load default data view'));
  }, [dataViews]);

  if (error) {
    return <EuiText color="danger">{error}</EuiText>;
  }

  if (!dataView) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        `}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div
      css={css`
        height: 100%;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      `}
    >
      <DevGraphWithFlyout
        dataView={dataView}
        entityActionsMode="hover"
        entityStyleMode="colored"
      />
    </div>
  );
};
