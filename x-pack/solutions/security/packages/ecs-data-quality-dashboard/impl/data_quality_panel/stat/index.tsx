/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    text: css({
      whiteSpace: 'nowrap',
    }),
    description: css({
      marginRight: euiTheme.size.s,
      verticalAlign: 'baseline',
    }),
  };
};

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
  const styles = useStyles();
  return (
    <EuiToolTip content={tooltipText}>
      <EuiText css={styles.text} data-test-subj="stat" size={'xs'}>
        {children && <span css={styles.description}>{children}</span>}
        <EuiBadge color={badgeColor} {...badgeProps}>
          {badgeText}
        </EuiBadge>
      </EuiText>
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
