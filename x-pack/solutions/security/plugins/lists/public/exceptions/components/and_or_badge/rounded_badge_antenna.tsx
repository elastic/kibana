/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';

import { RoundedBadge } from './rounded_badge';

import type { AndOr } from '.';

const TopAntenna = styled(EuiFlexItem)`
  background: ${({ theme }): string => theme.euiTheme.colors.backgroundBaseSubdued};
  position: relative;
  width: 2px;
  &:after {
    background: ${({ theme }): string => theme.euiTheme.colors.backgroundBaseSubdued};
    content: '';
    height: 8px;
    right: -4px;
    position: absolute;
    width: 10px;
    clip-path: circle();
    top: 0;
  }
`;
const BottomAntenna = styled(EuiFlexItem)`
  background: ${({ theme }): string => theme.euiTheme.colors.backgroundBaseSubdued};
  position: relative;
  width: 2px;
  &:after {
    background: ${({ theme }): string => theme.euiTheme.colors.backgroundBaseSubdued};
    content: '';
    height: 8px;
    right: -4px;
    position: absolute;
    width: 10px;
    clip-path: circle();
    bottom: 0;
  }
`;

export const RoundedBadgeAntenna: React.FC<{ type: AndOr }> = ({ type }) => (
  <EuiFlexGroup
    className="andBadgeContainer"
    gutterSize="none"
    direction="column"
    alignItems="center"
  >
    <TopAntenna data-test-subj="andOrBadgeBarTop" grow={1} />
    <EuiFlexItem grow={false}>
      <RoundedBadge type={type} />
    </EuiFlexItem>
    <BottomAntenna data-test-subj="andOrBadgeBarBottom" grow={1} />
  </EuiFlexGroup>
);

RoundedBadgeAntenna.displayName = 'RoundedBadgeAntenna';
