/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EuiFocusTrap, EuiTitle, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { GRAPH_PANEL_INSET } from '../constants';
import {
  CONTROL_PANEL_MARGIN_LEFT,
  CONTROL_PANEL_WIDTH_PX,
  GRAPH_FLOATING_PANEL_GAP_FROM_CONTROLS,
} from './controls';

export interface GraphTopLeftFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Bottom-bar control that toggles this panel (excluded from outside-click dismiss). */
  children: React.ReactElement;
  /** Visible panel title (rendered in a real header — not EuiPopoverTitle). */
  title: string;
  titleId?: string;
  /** Panel body content below the header. */
  body: React.ReactNode;
  'aria-label'?: string;
  'data-test-subj'?: string;
}

/**
 * Floating panel fixed to the top-left of the React Flow canvas, to the right of
 * the zoom controls (16px gap). Header is always visible; body scrolls only when
 * content exceeds the available canvas height.
 */
export const GraphTopLeftFloatingPanel = ({
  isOpen,
  onClose,
  children,
  title,
  titleId,
  body,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: GraphTopLeftFloatingPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const panelShadow = useEuiShadow('m');
  const buttonWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHost(null);
      return;
    }
    const reactFlow = buttonWrapRef.current?.closest('.react-flow');
    setHost(reactFlow ?? null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (panelRef.current?.contains(target) || buttonWrapRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen, onClose]);

  const leftOffset =
    CONTROL_PANEL_MARGIN_LEFT + CONTROL_PANEL_WIDTH_PX + GRAPH_FLOATING_PANEL_GAP_FROM_CONTROLS;

  const panelCss = css`
    position: absolute;
    top: ${GRAPH_PANEL_INSET}px;
    left: ${leftOffset}px;
    z-index: ${euiTheme.levels.menu};
    display: flex;
    flex-direction: column;
    max-height: calc(100% - ${GRAPH_PANEL_INSET * 2}px);
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.backgroundBasePlain};
    overflow: hidden;
    pointer-events: auto;
    ${panelShadow};
  `;

  const headerCss = css`
    flex-shrink: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const bodyCss = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  `;

  return (
    <>
      <div
        ref={buttonWrapRef}
        css={css`
          display: inline-flex;
        `}
      >
        {children}
      </div>
      {isOpen &&
        host &&
        createPortal(
          <div
            ref={panelRef}
            css={panelCss}
            role="dialog"
            aria-modal="false"
            aria-label={ariaLabel ?? title}
            aria-labelledby={titleId}
            data-test-subj={dataTestSubj}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <EuiFocusTrap clickOutsideDisables={true} returnFocus={false}>
              <div css={headerCss}>
                <EuiTitle size="xs">
                  <h4 id={titleId}>{title}</h4>
                </EuiTitle>
              </div>
              <div css={bodyCss}>{body}</div>
            </EuiFocusTrap>
          </div>,
          host
        )}
    </>
  );
};
