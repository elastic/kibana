/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiFlexItem,
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
  onZoomIn,
  onZoomOut,
  onCenter,
  onFitView,
  css: baseCss,
  ...props
}: ControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { maxZoomReached, minZoomReached } = useStore(selector);

  const onZoomInHandler = () => {
    zoomIn();
    onZoomIn?.();
  };

  const onZoomOutHandler = () => {
    zoomOut();
    onZoomOut?.();
  };

  const onFitViewHandler = () => {
    fitView(fitViewOptions);
    onFitView?.();
  };

  if (!showZoom && !showCenter && !showFitView) {
    return <></>;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize={'none'}
      css={[
        baseCss,
        css`
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `,
      ]}
      {...props}
    >
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
              onClick={onZoomOutHandler}
            />
          </EuiFlexItem>
        </>
      )}
      {showZoom && (showCenter || showFitView) && <EuiHorizontalRule size="full" margin="none" />}
      {showFitView && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="vector"
            aria-label={FitViewLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_FIT_VIEW_ID}
            onClick={onFitViewHandler}
          />
        </EuiFlexItem>
      )}
      {showCenter && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="bullseye"
            aria-label={CenterLabel}
            size="m"
            color="text"
            data-test-subj={GRAPH_CONTROLS_CENTER_ID}
            onClick={() => onCenter?.()}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
