/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export const EndpointScriptFlyoutLoading = ({
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj={getTestId('header')}>
        <EuiSkeletonText lines={2} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSkeletonText lines={3} /> <EuiSpacer size="l" /> <EuiSkeletonText lines={3} />
        <EuiSpacer size="l" /> <EuiSkeletonText lines={3} />
      </EuiFlyoutBody>
    </>
  );
};

EndpointScriptFlyoutLoading.displayName = 'EndpointScriptFlyoutLoading';
