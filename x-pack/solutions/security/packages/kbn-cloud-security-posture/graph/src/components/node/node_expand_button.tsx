/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { NodeExpandButtonContainer, RoundEuiButtonIcon, ExpandButtonSize } from './styles';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';
import { GRAPH_NODE_EXPAND_BUTTON_ID } from '../test_ids';

export interface NodeExpandButtonProps {
  x?: string;
  y?: string;
  color?: EntityNodeViewModel['color'] | LabelNodeViewModel['color'];
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
}

export const NodeExpandButton = ({ x, y, color, onClick, ...props }: NodeExpandButtonProps) => {
  const { euiTheme } = useEuiTheme();

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
        backgroundColor={euiTheme.colors.backgroundBasePlain}
        iconType={isToggled ? 'minusInCircleFilled' : 'plusInCircleFilled'}
        onClick={onClickHandler}
        iconSize="m"
        aria-label="Open or close node actions"
        data-test-subj={GRAPH_NODE_EXPAND_BUTTON_ID}
      />
    </NodeExpandButtonContainer>
  );
};

NodeExpandButton.ExpandButtonSize = ExpandButtonSize;
