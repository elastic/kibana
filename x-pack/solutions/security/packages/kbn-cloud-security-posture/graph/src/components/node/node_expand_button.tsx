/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { StyledNodeExpandButton, RoundEuiButtonIcon, ExpandButtonSize } from './styles';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';
import { NODE_EXPAND_BUTTON_TEST_ID } from '../test_ids';

export interface NodeExpandButtonProps {
  x?: string;
  y?: string;
  color?: EntityNodeViewModel['color'] | LabelNodeViewModel['color'];
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
}

export const NodeExpandButton = ({ x, y, color, onClick }: NodeExpandButtonProps) => {
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
    <StyledNodeExpandButton x={x} y={y} className={isToggled ? 'toggled' : undefined}>
      <RoundEuiButtonIcon
        color={color ?? 'primary'}
        iconType={isToggled ? 'minusInCircleFilled' : 'plusInCircleFilled'}
        onClick={onClickHandler}
        iconSize="m"
        aria-label="Open or close node actions"
        data-test-subj={NODE_EXPAND_BUTTON_TEST_ID}
      />
    </StyledNodeExpandButton>
  );
};

NodeExpandButton.ExpandButtonSize = ExpandButtonSize;
