/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

const StyledEuiBadge = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
` as unknown as typeof EuiBadge;

interface BadgeListProps {
  badges: string[];
  'data-test-subj'?: string;
}

export const BadgeList = ({ badges, 'data-test-subj': dataTestSubj }: BadgeListProps) => (
  <EuiFlexGroup responsive={false} gutterSize="xs" wrap data-test-subj={dataTestSubj}>
    {badges.map((badge: string) => (
      <EuiFlexItem grow={false} key={`badge-${badge}`} data-test-subj={`${dataTestSubj}Item`}>
        <StyledEuiBadge color="hollow">{badge}</StyledEuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
