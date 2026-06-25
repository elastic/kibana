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
  useEuiShadow,
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
  GRAPH_CONTROLS_FULL_SCREEN_ID,
} from '../test_ids';
import fitToViewIcon from '../../assets/icons/fit_to_view.svg';
import type { NodeViewModel } from '../types';
import {
  CENTER_SHORTCUT,
  FIT_TO_SCREEN_SHORTCUT,
  FULL_SCREEN_SHORTCUT,
  ZOOM_IN_SHORTCUT,
  ZOOM_OUT_SHORTCUT,
  formatToolShortcutAriaLabel,
} from './graph_keyboard_shortcuts';
import { ToolShortcutTooltip } from './tool_shortcut_tooltip';
import { GraphControlTooltip } from './graph_control_tooltip';
import { useGraphZoomKeyboardShortcuts } from '../../hooks/use_graph_zoom_keyboard_shortcuts';

const selector = (s: ReactFlowState) => ({
  minZoomReached: s.transform[2] <= s.minZoom,
  maxZoomReached: s.transform[2] >= s.maxZoom,
});

export interface ControlsProps extends CommonProps {
  showZoom?: boolean;
  showFitView?: boolean;
  showFullScreen?: boolean;
  isFullScreen?: boolean;
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
  /** Callback when full screen button is clicked */
  onToggleFullScreen?: () => void;
}

const ZoomInLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.zoomIn', {
  defaultMessage: 'Zoom in',
});
const ZoomOutLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.zoomOut', {
  defaultMessage: 'Zoom out',
});
const FitToScreenLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.fitToScreen', {
  defaultMessage: 'Fit to screen',
});
const CenterLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.center', {
  defaultMessage: 'Center',
});
const FullScreenLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.fullScreen', {
  defaultMessage: 'Full screen',
});
const ExitFullScreenLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.exitFullScreen',
  { defaultMessage: 'Exit full screen' }
);

const fitToViewIconFn = () => <EuiIcon type={fitToViewIcon} size="m" color="text" />;

const zoomInAriaLabel = formatToolShortcutAriaLabel(ZoomInLabel, ZOOM_IN_SHORTCUT);
const zoomOutAriaLabel = formatToolShortcutAriaLabel(ZoomOutLabel, ZOOM_OUT_SHORTCUT);
const fitToScreenAriaLabel = formatToolShortcutAriaLabel(FitToScreenLabel, FIT_TO_SCREEN_SHORTCUT);
const centerAriaLabel = formatToolShortcutAriaLabel(CenterLabel, CENTER_SHORTCUT);
const fullScreenAriaLabel = formatToolShortcutAriaLabel(FullScreenLabel, FULL_SCREEN_SHORTCUT);
const exitFullScreenAriaLabel = formatToolShortcutAriaLabel(
  ExitFullScreenLabel,
  FULL_SCREEN_SHORTCUT
);

const CONTROL_PANEL_WIDTH = 48;
const CONTROL_PANEL_PADDING = 8;
const CONTROL_BUTTON_SIZE = 32;
const CONTROL_BUTTON_RADIUS = 4;
const ZOOM_BUTTON_GAP = 4;
const SECTION_GAP = 8;
/** Distance from the right edge of the graph canvas to the controls panel. */
export const CONTROL_PANEL_MARGIN_RIGHT = 16;
/** EUI medium drop shadow for the controls panel. */
const CONTROL_PANEL_SHADOW = 'm' as const;

interface ControlButtonProps {
  iconType: React.ComponentProps<typeof EuiButtonIcon>['iconType'];
  tooltipContent: React.ReactNode;
  ariaLabel: string;
  testSubj: string;
  onClick: () => void;
  disabled?: boolean;
  controlButtonCss: ReturnType<typeof css>;
}

const ControlButton = ({
  iconType,
  tooltipContent,
  ariaLabel,
  testSubj,
  onClick,
  disabled,
  controlButtonCss,
}: ControlButtonProps) => (
  <GraphControlTooltip content={tooltipContent} position="left" disableScreenReaderOutput>
    <EuiButtonIcon
      iconType={iconType}
      aria-label={ariaLabel}
      size="m"
      color="text"
      data-test-subj={testSubj}
      disabled={disabled}
      css={controlButtonCss}
      onClick={onClick}
    />
  </GraphControlTooltip>
);

export const Controls = ({
  showZoom = true,
  showFitView = true,
  showFullScreen = true,
  isFullScreen = false,
  nodeIdsToCenterOn = [],
  fitViewOptions,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFitView,
  onToggleFullScreen,
  ...props
}: ControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const groupShadow = useEuiShadow(CONTROL_PANEL_SHADOW);
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

  const showCenter = sanitizedNodeIds.length > 0;
  const showFullScreenButton = showFullScreen && onToggleFullScreen !== undefined;

  useGraphZoomKeyboardShortcuts({
    enabled: showZoom || showFitView || showFullScreenButton || showCenter,
    onZoomIn: onZoomInHandler,
    onZoomOut: onZoomOutHandler,
    onFitToScreen: onFitViewHandler,
    onToggleFullScreen: showFullScreenButton ? onToggleFullScreen : undefined,
    onCenter: showCenter ? onCenterHandler : undefined,
  });

  const controlButtonCss = css`
    && {
      width: ${CONTROL_BUTTON_SIZE}px;
      height: ${CONTROL_BUTTON_SIZE}px;
      min-width: ${CONTROL_BUTTON_SIZE}px;
      border-radius: ${CONTROL_BUTTON_RADIUS}px;
    }
  `;

  const panelShellCss = css`
    width: ${CONTROL_PANEL_WIDTH}px;
    padding: ${CONTROL_PANEL_PADDING}px;
    border: ${euiTheme.border.thin};
    border-radius: 8px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    overflow: visible;
    ${groupShadow};
  `;

  const panelLayoutCss = css`
    align-items: center;
  `;

  const zoomGroupCss = css`
    display: flex;
    flex-direction: column;
    gap: ${ZOOM_BUTTON_GAP}px;
  `;

  const viewGroupCss = css`
    display: flex;
    flex-direction: column;
    gap: ${SECTION_GAP}px;
  `;

  const sectionDividerCss = css`
    width: 100%;
    margin: ${SECTION_GAP}px 0;
  `;

  if (!showZoom && !showCenter && !showFitView && !showFullScreenButton) {
    return null;
  }

  const showViewSection = showFitView || showFullScreenButton;
  const showSectionDivider = (showZoom || showCenter) && showViewSection;

  return (
    <div css={panelShellCss} {...props}>
      <EuiFlexGroup direction="column" gutterSize="none" css={panelLayoutCss}>
        {(showZoom || showCenter) && (
          <EuiFlexItem grow={false} css={zoomGroupCss}>
            {showZoom && (
              <>
                <ControlButton
                  iconType="plusCircle"
                  tooltipContent={
                    <ToolShortcutTooltip label={ZoomInLabel} shortcut={ZOOM_IN_SHORTCUT} />
                  }
                  ariaLabel={zoomInAriaLabel}
                  testSubj={GRAPH_CONTROLS_ZOOM_IN_ID}
                  disabled={maxZoomReached}
                  controlButtonCss={controlButtonCss}
                  onClick={onZoomInHandler}
                />
                <ControlButton
                  iconType="minusCircle"
                  tooltipContent={
                    <ToolShortcutTooltip label={ZoomOutLabel} shortcut={ZOOM_OUT_SHORTCUT} />
                  }
                  ariaLabel={zoomOutAriaLabel}
                  testSubj={GRAPH_CONTROLS_ZOOM_OUT_ID}
                  disabled={minZoomReached}
                  controlButtonCss={controlButtonCss}
                  onClick={onZoomOutHandler}
                />
              </>
            )}
            {showCenter && (
              <ControlButton
                iconType="bullseye"
                tooltipContent={
                  <ToolShortcutTooltip label={CenterLabel} shortcut={CENTER_SHORTCUT} />
                }
                ariaLabel={centerAriaLabel}
                testSubj={GRAPH_CONTROLS_CENTER_ID}
                controlButtonCss={controlButtonCss}
                onClick={onCenterHandler}
              />
            )}
          </EuiFlexItem>
        )}
        {showSectionDivider && (
          <EuiFlexItem grow={false} css={sectionDividerCss}>
            <EuiHorizontalRule size="full" margin="none" />
          </EuiFlexItem>
        )}
        {showViewSection && (
          <EuiFlexItem grow={false} css={viewGroupCss}>
            {showFitView && (
              <ControlButton
                iconType={fitToViewIconFn}
                tooltipContent={
                  <ToolShortcutTooltip label={FitToScreenLabel} shortcut={FIT_TO_SCREEN_SHORTCUT} />
                }
                ariaLabel={fitToScreenAriaLabel}
                testSubj={GRAPH_CONTROLS_FIT_VIEW_ID}
                controlButtonCss={controlButtonCss}
                onClick={onFitViewHandler}
              />
            )}
            {showFullScreenButton && (
              <ControlButton
                iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
                tooltipContent={
                  <ToolShortcutTooltip
                    label={isFullScreen ? ExitFullScreenLabel : FullScreenLabel}
                    shortcut={FULL_SCREEN_SHORTCUT}
                  />
                }
                ariaLabel={isFullScreen ? exitFullScreenAriaLabel : fullScreenAriaLabel}
                testSubj={GRAPH_CONTROLS_FULL_SCREEN_ID}
                controlButtonCss={controlButtonCss}
                onClick={onToggleFullScreen}
              />
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
