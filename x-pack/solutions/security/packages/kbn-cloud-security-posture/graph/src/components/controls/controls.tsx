/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  useEuiTheme,
  type CommonProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { type ReactFlowState, useStore, useReactFlow, type FitViewOptions } from '@xyflow/react';
import {
  GRAPH_CONTROLS_FIT_VIEW_ID,
  GRAPH_CONTROLS_CENTER_ID,
  GRAPH_CONTROLS_ZOOM_IN_ID,
  GRAPH_CONTROLS_ZOOM_OUT_ID,
} from '../test_ids';
import fitToViewIcon from '../../assets/icons/fit_to_view.svg';
import type { NodeViewModel } from '../types';

const selector = (s: ReactFlowState) => ({
  minZoomReached: s.transform[2] <= s.minZoom,
  maxZoomReached: s.transform[2] >= s.maxZoom,
});

export interface ControlsProps extends CommonProps {
  showZoom?: boolean;
  showFitView?: boolean;
  /** Array of node IDs the graph must center on */
  nodeIdsToCenterOn?: NodeViewModel['id'][];
  fitViewOptions?: FitViewOptions;
  /** Callback when zoom in button is clicked */
  onZoomIn?: () => void;
  /** Callback when zoom out button is clicked */
  onZoomOut?: () => void;
  /** Callback when fit view button is clicked */
  onFitView?: () => void;
  /** Callback when center button is clicked */
  onCenter?: () => void;
}

const ZoomInLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.zoomIn', {
  defaultMessage: 'Zoom in',
});
const ZoomOutLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.zoomOut', {
  defaultMessage: 'Zoom out',
});
const FitViewLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.fitView', {
  defaultMessage: 'Fit view',
});
const CenterLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.center', {
  defaultMessage: 'Center',
});

const fitToViewIconFn = () => <EuiIcon type={fitToViewIcon} size="m" color="text" />;

export const Controls = ({
  showZoom = true,
  showFitView = true,
  nodeIdsToCenterOn = [],
  fitViewOptions,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFitView,
  ...props
}: ControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { maxZoomReached, minZoomReached } = useStore(selector);

  // Memoize a sanitized list of node ids filtering out undefined/null, empty and whitespace strings
  // Converts ['node1', 'node2'] into [{ id: 'node1' }, { id: 'node2' }]
  const sanitizedNodeIds = useMemo(
    () =>
      (nodeIdsToCenterOn ?? []).filter((id) => id && id.trim().length > 0).map((id) => ({ id })),
    [nodeIdsToCenterOn]
  );

  const onZoomInHandler = useCallback(() => {
    zoomIn({ duration: fitViewOptions?.duration });
    onZoomIn?.();
  }, [fitViewOptions?.duration, zoomIn, onZoomIn]);

  const onZoomOutHandler = useCallback(() => {
    zoomOut({ duration: fitViewOptions?.duration });
    onZoomOut?.();
  }, [fitViewOptions?.duration, zoomOut, onZoomOut]);

  const onFitViewHandler = useCallback(() => {
    fitView(fitViewOptions);
    onFitView?.();
  }, [fitViewOptions, fitView, onFitView]);

  const onCenterHandler = useCallback(() => {
    fitView({ ...fitViewOptions, nodes: sanitizedNodeIds });
    onCenter?.();
  }, [fitViewOptions, fitView, onCenter, sanitizedNodeIds]);

  const btnCss = css`
    border-radius: 0;
  `;

  const groupCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const showCenter = sanitizedNodeIds.length > 0;

  if (!showZoom && !showCenter && !showFitView) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={groupCss} {...props}>
      {showZoom && (
        <>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="plusInCircle"
              aria-label={ZoomInLabel}
              size="m"
              color="text"
              data-test-subj={GRAPH_CONTROLS_ZOOM_IN_ID}
              disabled={maxZoomReached}
              css={btnCss}
              onClick={onZoomInHandler}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="minusInCircle"
              aria-label={ZoomOutLabel}
              size="m"
              color="text"
              data-test-subj={GRAPH_CONTROLS_ZOOM_OUT_ID}
              disabled={minZoomReached}
              css={btnCss}
              onClick={onZoomOutHandler}
            />
          </EuiFlexItem>
        </>
      )}
      {showCenter && (
        <EuiFlexItem grow={false}>
          {showZoom ? <EuiHorizontalRule size="full" margin="none" /> : null}
          <EuiButtonIcon
            iconType="bullseye"
            aria-label={CenterLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_CENTER_ID}
            css={btnCss}
            onClick={onCenterHandler}
          />
        </EuiFlexItem>
      )}
      {showFitView && (
        <EuiFlexItem grow={false}>
          {showZoom || showCenter ? <EuiHorizontalRule size="full" margin="none" /> : null}
          <EuiButtonIcon
            iconType={fitToViewIconFn}
            aria-label={FitViewLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_FIT_VIEW_ID}
            css={btnCss}
            onClick={onFitViewHandler}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
