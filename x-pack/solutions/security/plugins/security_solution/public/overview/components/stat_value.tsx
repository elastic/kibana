/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiProgress, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';

import { DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { useUiSetting$ } from '../../common/lib/kibana';

const ProgressContainer = styled.div`
  margin-left: 8px;
  min-width: 100px;
  @media only screen and (min-width: 1400px) {
    min-width: 200px;
  }
`;

const StatValueComponent: React.FC<{
  count: number;
  isGroupStat: boolean;
  isLoading: boolean;
  max: number;
}> = ({ count, isGroupStat, isLoading, max }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (isInitialLoading && !isLoading) {
      setIsInitialLoading(false);
    }
  }, [isLoading, isInitialLoading, setIsInitialLoading]);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        {!isInitialLoading && (
          <EuiText color={isGroupStat ? 'default' : 'subdued'} size={isGroupStat ? 'm' : 's'}>
            {numeral(count).format(defaultNumberFormat)}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ProgressContainer>
          {isLoading ? (
            <EuiSkeletonText data-test-subj="stat-value-loading-spinner" lines={1} />
          ) : (
            <EuiProgress
              color={isGroupStat ? 'primary' : 'subdued'}
              max={max}
              size="m"
              value={count}
            />
          )}
        </ProgressContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

StatValueComponent.displayName = 'StatValueComponent';

export const StatValue = React.memo(StatValueComponent);
