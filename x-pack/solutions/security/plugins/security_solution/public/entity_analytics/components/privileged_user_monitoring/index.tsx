/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';

export const PrivilegedUserMonitoring = () => {
  return (
    <>
      <EuiFlexGroup
        direction="row"
        justifyContent="spaceBetween"
        gutterSize="xl"
        alignItems="center"
      >
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder={true}>
            <span>{'Risk levels of privileged users'}</span>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder={true}>
            <span>{'Top risky privileged users'}</span>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <span>{'Top privileged access detections'}</span>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        {'Privileged user activity'}
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        {'Privileged users'}
      </EuiPanel>
    </>
  );
};
