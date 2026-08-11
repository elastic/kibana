/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { i18n } from '@kbn/i18n';
import { GraphVisualization } from '../../../shared/components/graph_visualization';

export const EntityGraphPanelKey = 'entity_graph' as const;

/** Default width: a bit larger than the entity flyout (~500px), still resizable. */
export const ENTITY_GRAPH_FLYOUT_DEFAULT_WIDTH = 720;
export const ENTITY_GRAPH_FLYOUT_MIN_WIDTH = 480;
export const ENTITY_GRAPH_FLYOUT_MAX_WIDTH = 1200;

export const getEntityGraphFlyoutOptions = (): OverlaySystemFlyoutOpenOptions => ({
  ownFocus: false,
  paddingSize: 'none',
  resizable: true,
  size: ENTITY_GRAPH_FLYOUT_DEFAULT_WIDTH,
  minWidth: ENTITY_GRAPH_FLYOUT_MIN_WIDTH,
  maxWidth: ENTITY_GRAPH_FLYOUT_MAX_WIDTH,
  session: 'start',
  title: i18n.translate('xpack.securitySolution.flyout.entityGraph.flyoutTitle', {
    defaultMessage: 'Graph view',
  }),
});

export interface EntityGraphPanelProps extends Record<string, unknown> {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
  /** Scope ID for the flyout panel */
  scopeId: string;
}

export interface EntityGraphExpandableFlyoutProps extends FlyoutPanelProps {
  key: typeof EntityGraphPanelKey;
  params: EntityGraphPanelProps;
}

export const ENTITY_GRAPH_PANEL_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.panelAriaLabel.entityGraph',
  { defaultMessage: 'Entity graph view' }
);

const BACK_LABEL = i18n.translate('xpack.securitySolution.flyout.entityGraph.backButtonLabel', {
  defaultMessage: 'Back',
});

const TITLE = i18n.translate('xpack.securitySolution.flyout.entityGraph.title', {
  defaultMessage: 'Graph',
});

export interface EntityGraphFlyoutContentProps {
  entityId: string;
  scopeId: string;
  /** Closes the graph flyout and returns to the entity flyout underneath. */
  onBack: () => void;
}

/**
 * Full entity graph opened from the entity flyout Visualizations preview.
 * Rendered inside a resizable system flyout (Back closes it → entity flyout).
 */
export const EntityGraphFlyoutContent: FC<EntityGraphFlyoutContentProps> = memo(
  ({ entityId, scopeId, onBack }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="arrowLeft"
                iconSide="left"
                flush="left"
                onClick={onBack}
                aria-label={BACK_LABEL}
              >
                {BACK_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiTitle size="xs">
                <h2>{TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          css={css`
            height: 100%;
            .euiFlyoutBody__overflow {
              height: 100%;
            }
            .euiFlyoutBody__overflowContent {
              height: 100%;
              display: flex;
              flex-direction: column;
              padding: 0 !important;
            }
          `}
        >
          <div
            css={css`
              flex: 1;
              min-height: 480px;
              height: 100%;
            `}
          >
            <GraphVisualization mode="entity" entityId={entityId} scopeId={scopeId} />
          </div>
        </EuiFlyoutBody>
      </>
    );
  }
);

EntityGraphFlyoutContent.displayName = 'EntityGraphFlyoutContent';

/**
 * Expandable-flyout registered panel fallback (kept for URL recovery).
 * Prefer {@link EntityGraphFlyoutContent} via openSystemFlyout from the preview.
 */
export const EntityGraphPanel: FC<EntityGraphPanelProps> = memo(({ entityId, scopeId }) => {
  return (
    <EntityGraphFlyoutContent
      entityId={entityId}
      scopeId={scopeId}
      onBack={() => {
        // no-op when recovered from URL without a close handler; user can use flyout X
      }}
    />
  );
});

EntityGraphPanel.displayName = 'EntityGraphPanel';
