/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

const StyledText = styled(EuiText)`
  white-space: nowrap;
`;

const StyledDescription = styled.span`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  vertical-align: baseline;
`;

export interface Props {
  badgeText: string;
  badgeColor?: string;
  tooltipText?: string;
  children?: React.ReactNode;
  badgeProps?: React.ComponentProps<typeof EuiBadge>;
}

const StatComponent: React.FC<Props> = ({
  badgeColor = 'hollow',
  badgeText,
  tooltipText,
  children,
  badgeProps,
}) => {
  return (
    <EuiToolTip content={tooltipText}>
      <StyledText data-test-subj="stat" size={'xs'}>
        {children && <StyledDescription>{children}</StyledDescription>}
        <EuiBadge color={badgeColor} {...badgeProps}>
          {badgeText}
        </EuiBadge>
      </StyledText>
    </EuiToolTip>
  );
};

StatComponent.displayName = 'StatComponent';

// The badgeProps object requires a deeper level of comparison than the default shallow comparison.
// However, using _.isEqual for this purpose would be excessive.
// The other properties should continue to be checked shallowly.
// In essence, only badgeProps needs a deeper comparison,
// while the remaining properties can be compared using React's internal Object.is comparison.
export const arePropsEqualOneLevelDeep = <T extends Props>(prevProps: T, nextProps: T): boolean => {
  for (const key of Object.keys(prevProps) as Array<keyof T>) {
    if (key === 'badgeProps') {
      const prevValue = prevProps[key];
      const nextValue = nextProps[key];
      if (prevValue && nextValue) {
        return arePropsEqualOneLevelDeep(
          prevValue as unknown as Props,
          nextValue as unknown as Props
        );
      }
    }

    if (!Object.is(prevProps[key], nextProps[key])) {
      return false;
    }
  }

  return true;
};

export const Stat = React.memo(StatComponent, arePropsEqualOneLevelDeep);
