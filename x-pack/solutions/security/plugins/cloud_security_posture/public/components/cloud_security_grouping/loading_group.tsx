/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const LoadingGroup = () => {
  return (
    <EuiSkeletonTitle size="s" isLoading={true}>
      <FormattedMessage id="xpack.csp.grouping.loadingGroupPanelTitle" defaultMessage="Loading" />
    </EuiSkeletonTitle>
  );
};
