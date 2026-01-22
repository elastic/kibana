/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps, CommonProps, EuiListGroupItemProps } from '@elastic/eui';
import { useEuiTheme, EuiIcon, EuiListGroupItem, EuiText } from '@elastic/eui';
import styled from '@emotion/styled';

interface EuiColorProps {
  color: keyof ReturnType<typeof useEuiTheme>['euiTheme']['colors'];
}

type IconContainerProps = EuiColorProps;

const IconContainer = styled.div<IconContainerProps>`
  position: relative;
  width: 24px;
  height: 24px;
  color: ${({ color }) => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.colors[color];
  }};
  margin-right: 8px;
`;

const StyleEuiIcon = styled(EuiIcon)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

type PopoverListItemIconProps = EuiIconProps & EuiColorProps;

const PopoverListItemIcon = ({ color, ...rest }: PopoverListItemIconProps) => (
  <IconContainer color={color}>
    <StyleEuiIcon color={color} {...rest} />
  </IconContainer>
);

export const PopoverListItem = (
  props: CommonProps &
    Pick<
      EuiListGroupItemProps,
      'iconType' | 'label' | 'onClick' | 'disabled' | 'showToolTip' | 'toolTipText' | 'toolTipProps'
    >
) => {
  const { iconType, label, onClick, disabled, showToolTip, toolTipText, toolTipProps, ...rest } =
    props;

  return (
    <EuiListGroupItem
      {...rest}
      icon={
        iconType ? (
          <PopoverListItemIcon color={disabled ? 'textSubdued' : 'text'} type={iconType} size="m" />
        ) : undefined
      }
      label={<EuiText>{label}</EuiText>}
      onClick={onClick}
      isDisabled={disabled}
      showToolTip={showToolTip}
      toolTipText={toolTipText}
      toolTipProps={toolTipProps}
    />
  );
};
