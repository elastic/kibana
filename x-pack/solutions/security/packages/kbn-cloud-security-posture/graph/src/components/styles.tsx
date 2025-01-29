/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  EuiIconProps,
  _EuiBackgroundColor,
  CommonProps,
  EuiListGroupItemProps,
} from '@elastic/eui';
import {
  useEuiBackgroundColor,
  useEuiTheme,
  EuiIcon,
  EuiListGroupItem,
  EuiText,
} from '@elastic/eui';
import styled from '@emotion/styled';

interface EuiColorProps {
  color: keyof ReturnType<typeof useEuiTheme>['euiTheme']['colors'];
  background: _EuiBackgroundColor;
}

type IconContainerProps = EuiColorProps;

const IconContainer = styled.div<IconContainerProps>`
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: ${({ color }) => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.colors[color];
  }};
  background-color: ${({ background }) => useEuiBackgroundColor(background)};
  border: 1px solid
    ${({ color }) => {
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

type RoundedEuiIconProps = EuiIconProps & EuiColorProps;

const RoundedEuiIcon = ({ color, background, ...rest }: RoundedEuiIconProps) => (
  <IconContainer color={color} background={background}>
    <StyleEuiIcon color={color} {...rest} />
  </IconContainer>
);

export const ExpandPopoverListItem = (
  props: CommonProps & Pick<EuiListGroupItemProps, 'iconType' | 'label' | 'onClick'>
) => {
  const { iconType, label, onClick, ...rest } = props;
  const { euiTheme } = useEuiTheme();
  return (
    <EuiListGroupItem
      {...rest}
      icon={
        iconType ? (
          <RoundedEuiIcon color="primary" background="primary" type={iconType} size="s" />
        ) : undefined
      }
      label={
        <EuiText size="s" color={euiTheme.colors.primaryText}>
          {label}
        </EuiText>
      }
      onClick={onClick}
    />
  );
};
