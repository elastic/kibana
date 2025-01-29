/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';

export const ConfigurationSkeleton: React.FC = () => (
  <>
    <EuiSkeletonTitle size="m" />
    <EuiSpacer size="m" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="xs" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="xs" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="l" />
    <EuiSkeletonTitle size="m" />
    <EuiSpacer size="m" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="xs" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="xs" />
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="xs" />
  </>
);
