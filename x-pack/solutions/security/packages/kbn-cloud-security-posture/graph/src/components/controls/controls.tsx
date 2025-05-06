/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
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

const selector = (s: ReactFlowState) => ({
  minZoomReached: s.transform[2] <= s.minZoom,
  maxZoomReached: s.transform[2] >= s.maxZoom,
});

export interface ControlsProps extends CommonProps {
  showZoom?: boolean;
  showFitView?: boolean;
  showCenter?: boolean;
  fitViewOptions?: FitViewOptions;
  /** Duration of zoom transition in milliseconds */
  zoomDuration?: number;
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

export const Controls = ({
  showZoom = true,
  showFitView = true,
  showCenter = true,
  fitViewOptions,
  zoomDuration = 500,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFitView,
  ...props
}: ControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { maxZoomReached, minZoomReached } = useStore(selector);

  const onZoomInHandler = () => {
    zoomIn({ duration: zoomDuration });
    onZoomIn?.();
  };

  const onZoomOutHandler = () => {
    zoomOut({ duration: zoomDuration });
    onZoomOut?.();
  };

  const onFitViewHandler = () => {
    fitView(fitViewOptions);
    onFitView?.();
  };

  const btnCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.backgroundBasePlain};
    box-sizing: content-box;
  `;

  if (!showZoom && !showCenter && !showFitView) {
    return <></>;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize={'none'} {...props}>
      {showZoom && (
        <EuiFlexItem grow={false} css={btnCss}>
          <EuiButtonIcon
            iconType="plusInCircle"
            aria-label={ZoomInLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_ZOOM_IN_ID}
            disabled={maxZoomReached}
            onClick={onZoomInHandler}
          />
          <EuiButtonIcon
            iconType="minusInCircle"
            aria-label={ZoomOutLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_ZOOM_OUT_ID}
            disabled={minZoomReached}
            onClick={onZoomOutHandler}
          />
        </EuiFlexItem>
      )}
      {showZoom && showCenter && <EuiSpacer size="xs" />}
      {showCenter && (
        <EuiButtonIcon
          iconType="bullseye"
          aria-label={CenterLabel}
          size="m"
          color="text"
          data-test-subj={GRAPH_CONTROLS_CENTER_ID}
          css={btnCss}
          onClick={() => onCenter?.()}
        />
      )}
      {(showZoom || showCenter) && showFitView && <EuiSpacer size="xs" />}
      {showFitView && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="continuityWithin"
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
