/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { NodeExpandButtonContainer, RoundEuiButtonIcon, ExpandButtonSize } from './styles';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';
import { GRAPH_NODE_EXPAND_BUTTON_ID } from '../test_ids';

export interface NodeExpandButtonProps {
  x?: string;
  y?: string;
  color?: EntityNodeViewModel['color'] | LabelNodeViewModel['color'];
  /**
   * When true, renders a solid filled circle (blue by default) with a white
   * glyph — matching the 9.5 entity node design. Defaults to false, keeping the
   * original white-background outline style used by connector (label) nodes.
   */
  filled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
}

export const NodeExpandButton = ({
  x,
  y,
  color,
  filled = false,
  onClick,
  ...props
}: NodeExpandButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');

  // State to track whether the icon is "plus" or "minus"
  const [isToggled, setIsToggled] = useState(false);

  const unToggleCallback = useCallback(() => {
    setIsToggled(false);
  }, []);

  const onClickHandler = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setIsToggled((currIsToggled) => !currIsToggled);
      onClick?.(e, unToggleCallback);
    },
    [onClick, unToggleCallback]
  );

  return (
    <NodeExpandButtonContainer x={x} y={y} className={isToggled ? 'toggled' : undefined} {...props}>
      <RoundEuiButtonIcon
        color={color ?? 'primary'}
        display={filled ? 'fill' : 'empty'}
        filled={filled}
        backgroundColor={filled ? 'transparent' : euiTheme.colors.backgroundBasePlain}
        iconType={isToggled ? 'minusCircle' : 'plusCircle'}
        onClick={onClickHandler}
        iconSize="m"
        aria-label="Open or close node actions"
        data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
        css={
          filled
            ? css`
                ${shadow}
              `
            : undefined
        }
      />
    </NodeExpandButtonContainer>
  );
};

NodeExpandButton.ExpandButtonSize = ExpandButtonSize;
