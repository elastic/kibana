/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, type RefObject } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NodeExpandButtonContainer } from './styles';
import { GRAPH_NODE_EXPAND_BUTTON_ID } from '../test_ids';
import { EVENT_PILL_HEIGHT } from './label_node/event_pill_styles';

/** Figma action_menu_single (node 11904:2349): 24×24 filled primary button. */
export const PILL_EXPAND_BUTTON_SIZE = 24;

export const TEST_SUBJ_PILL_EXPAND_BTN = 'pill-node-expand-btn';

export interface PillExpandButtonProps {
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  'data-test-subj'?: string;
}

export const PillExpandButton = ({
  onClick,
  containerRef,
  'data-test-subj': dataTestSubj = TEST_SUBJ_PILL_EXPAND_BTN,
}: PillExpandButtonProps) => {
  const [isToggled, setIsToggled] = useState(false);

  const unToggleCallback = useCallback(() => {
    setIsToggled(false);
  }, []);

  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setIsToggled((curr) => !curr);
      onClick?.(e, unToggleCallback);
    },
    [onClick, unToggleCallback]
  );

  const topOffset = (EVENT_PILL_HEIGHT - PILL_EXPAND_BUTTON_SIZE) / 2;

  return (
    <NodeExpandButtonContainer
      ref={containerRef}
      className={isToggled ? 'toggled' : undefined}
      data-test-subj={dataTestSubj}
      css={css`
        position: absolute;
        right: -12px;
        top: ${topOffset}px;
        z-index: 2;
        opacity: 0;
        transition: opacity 0.2s ease;

        &.toggled {
          opacity: 1;
        }

        .react-flow__node:not(.non-interactive):hover &,
        .react-flow__node:not(.non-interactive).selected & {
          opacity: 1;
        }

        &:has(button:focus) {
          opacity: 1;
        }
      `}
    >
      <EuiButtonIcon
        iconType={isToggled ? 'minusInCircle' : 'plusCircle'}
        aria-label={i18n.translate('securitySolutionPackages.csp.graph.pillNode.expandActions', {
          defaultMessage: 'Open or close node actions',
        })}
        data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
        color="primary"
        display="fill"
        size="xs"
        onClick={onClickHandler}
        css={css`
          width: ${PILL_EXPAND_BUTTON_SIZE}px;
          height: ${PILL_EXPAND_BUTTON_SIZE}px;
          min-width: ${PILL_EXPAND_BUTTON_SIZE}px;
          border-radius: 50%;
        `}
      />
    </NodeExpandButtonContainer>
  );
};
