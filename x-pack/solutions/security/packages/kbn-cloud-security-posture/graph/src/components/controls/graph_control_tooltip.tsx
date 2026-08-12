/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { cloneElement, useState, type ReactElement, type ReactNode } from 'react';
import { EuiPopover, EuiToolTip, type EuiToolTipProps } from '@elastic/eui';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';

type ToolTipPosition = NonNullable<EuiToolTipProps['position']>;
type PopoverAnchorPosition = NonNullable<React.ComponentProps<typeof EuiPopover>['anchorPosition']>;

const TOOLTIP_TO_POPOVER_POSITION: Record<ToolTipPosition, PopoverAnchorPosition> = {
  top: 'upCenter',
  bottom: 'downCenter',
  left: 'leftCenter',
  right: 'rightCenter',
};

interface GraphControlTooltipProps {
  content: ReactNode;
  children: ReactElement;
  position?: ToolTipPosition;
  disableScreenReaderOutput?: boolean;
}

/**
 * Uses EuiToolTip normally. When the graph is in native browser fullscreen, EUI
 * tooltips (portaled to document.body) are hidden — so we render via EuiPopover
 * into the fullscreen overlay container instead.
 */
export const GraphControlTooltip = ({
  content,
  children,
  position = 'top',
  disableScreenReaderOutput = false,
}: GraphControlTooltipProps) => {
  const fullscreenContext = useGraphFullscreenContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!fullscreenContext?.isFullscreen) {
    return (
      <EuiToolTip
        content={content}
        position={position}
        disableScreenReaderOutput={disableScreenReaderOutput}
      >
        {children}
      </EuiToolTip>
    );
  }

  const overlayContainer = fullscreenContext.overlayContainerRef.current ?? undefined;
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <EuiPopover
      button={cloneElement(children, {
        onMouseEnter: (event: React.MouseEvent) => {
          open();
          children.props.onMouseEnter?.(event);
        },
        onMouseLeave: (event: React.MouseEvent) => {
          close();
          children.props.onMouseLeave?.(event);
        },
        onFocus: (event: React.FocusEvent) => {
          open();
          children.props.onFocus?.(event);
        },
        onBlur: (event: React.FocusEvent) => {
          close();
          children.props.onBlur?.(event);
        },
      })}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition={TOOLTIP_TO_POPOVER_POSITION[position]}
      container={overlayContainer}
      panelPaddingSize="s"
      closePopoverOnScroll={false}
      panelProps={{
        onMouseEnter: open,
        onMouseLeave: close,
      }}
    >
      {content}
    </EuiPopover>
  );
};
