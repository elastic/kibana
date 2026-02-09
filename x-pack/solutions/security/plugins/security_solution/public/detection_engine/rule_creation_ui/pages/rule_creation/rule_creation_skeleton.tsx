/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSkeletonCircle,
  EuiSkeletonTitle,
  EuiSkeletonRectangle,
  EuiHorizontalRule,
} from '@elastic/eui';
import styled from 'styled-components';

const MyEuiPanel = styled(EuiPanel)<{ zindex?: number }>`
  position: relative;
  z-index: ${({ zindex }) => zindex ?? 0};
`;

MyEuiPanel.displayName = 'MyEuiPanel';

export const RuleCreationSkeleton: React.FC = () => {
  return (
    <>
      {/* Header Skeleton - 2 titles on opposite sides */}
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        style={{ marginBottom: '24px' }}
      >
        <EuiFlexItem grow={false}>
          <EuiSkeletonTitle size="l" style={{ width: '120px' }} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSkeletonTitle size="l" style={{ width: '120px' }} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Form Panels Skeleton */}
      <MyEuiPanel zindex={4} hasBorder>
        <EuiPanel paddingSize="s">
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSkeletonCircle size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSkeletonTitle size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle width={203} height={148} borderRadius="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="flexEnd"
            justifyContent="flexEnd"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiSkeletonTitle size="l" style={{ width: '120px' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </MyEuiPanel>
      <EuiSpacer size="l" />
      <MyEuiPanel zindex={4} hasBorder>
        <EuiPanel paddingSize="s">
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSkeletonCircle size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSkeletonTitle size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiSkeletonTitle size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
          <EuiSpacer size="l" />
          <EuiSkeletonText lines={4} />
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="flexEnd"
            justifyContent="flexEnd"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiSkeletonTitle size="l" style={{ width: '120px' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </MyEuiPanel>
      <EuiSpacer size="l" />
    </>
  );
};

