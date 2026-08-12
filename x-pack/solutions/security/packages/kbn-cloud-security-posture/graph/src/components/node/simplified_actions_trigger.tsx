/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { GRAPH_NODE_EXPAND_BUTTON_ID } from '../test_ids';

export const GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID = 'cloudSecurityGraphSimplifiedActionsTrigger';

/** Slide in from the right — same duration/ease as Test B toolbar. */
const triggerIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(6px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
`;

const triggerOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
  to {
    opacity: 0;
    transform: translateY(-50%) translateX(4px);
  }
`;

interface SimplifiedActionsTriggerProps {
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
  isExiting?: boolean;
}

/**
 * Test A / zoomed-out: `⋯` on the right of the entity icon.
 * Hover the entity → trigger slides in (same timing as Test B toolbar).
 * Hover the trigger → tooltip "Actions".
 * Click → opens the classic Action Menu popover to the right.
 */
export const SimplifiedActionsTrigger = memo<SimplifiedActionsTriggerProps>(
  ({ onClick, isExiting = false }) => {
    const { euiTheme } = useEuiTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const actionsLabel = i18n.translate(
      'securitySolutionPackages.csp.graph.node.card.expandActions',
      { defaultMessage: 'Actions' }
    );

    const unToggleCallback = useCallback(() => {
      setIsMenuOpen(false);
    }, []);

    const onClickHandler = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setIsMenuOpen((open) => !open);
        onClick?.(e, unToggleCallback);
      },
      [onClick, unToggleCallback]
    );

    return (
      <div
        data-test-subj={GRAPH_SIMPLIFIED_ACTIONS_TRIGGER_ID}
        className={isMenuOpen ? 'toggled' : undefined}
        css={css`
          position: absolute;
          left: calc(100% + ${euiTheme.size.xs});
          top: 50%;
          z-index: 5;
          pointer-events: ${isExiting ? 'none' : 'auto'};
          transform: translateY(-50%);
          animation: ${isExiting ? triggerOut : triggerIn} 0.14s ease-out forwards;
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EuiToolTip content={isMenuOpen ? '' : actionsLabel} position="right">
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={actionsLabel}
            data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
            color="text"
            display="empty"
            size="xs"
            onClick={onClickHandler}
            css={css`
              background-color: ${euiTheme.colors.backgroundBasePrimary};
              border-radius: ${euiTheme.border.radius.medium};
              color: ${euiTheme.colors.textParagraph};

              .euiIcon {
                fill: currentColor;
                color: inherit;
              }
            `}
          />
        </EuiToolTip>
      </div>
    );
  }
);

SimplifiedActionsTrigger.displayName = 'SimplifiedActionsTrigger';
