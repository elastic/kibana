/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { RoundedBadge } from './rounded_badge';

import type { AndOr } from '.';

export const RoundedBadgeAntenna: React.FC<{ type: AndOr }> = ({ type }) => {
  const { euiTheme } = useEuiTheme();
  const antennaStyles = css`
    background: ${euiTheme.colors.lightShade};
    position: relative;
    width: 2px;
    &:after {
      background: ${euiTheme.colors.lightShade};
      content: '';
      height: 8px;
      right: -4px;
      position: absolute;
      width: 10px;
      clip-path: circle();
    }
  `;
  const topAntennaStyles = css`
    ${antennaStyles}
    &:after {
      top: 0;
    }
  `;
  const bottomAntennaStyles = css`
    ${antennaStyles}
    &:after {
      bottom: 0;
    }
  `;

  return (
    <EuiFlexGroup
      className="andBadgeContainer"
      gutterSize="none"
      direction="column"
      alignItems="center"
    >
      <EuiFlexItem css={topAntennaStyles} data-test-subj="andOrBadgeBarTop" grow={1} />
      <EuiFlexItem grow={false}>
        <RoundedBadge type={type} />
      </EuiFlexItem>
      <EuiFlexItem css={bottomAntennaStyles} data-test-subj="andOrBadgeBarBottom" grow={1} />
    </EuiFlexGroup>
  );
};

RoundedBadgeAntenna.displayName = 'RoundedBadgeAntenna';
