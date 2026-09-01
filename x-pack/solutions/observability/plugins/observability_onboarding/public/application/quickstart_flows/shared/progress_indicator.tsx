/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import { type EuiCallOutProps, EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';

interface ProgressIndicatorProps extends EuiCallOutProps {
  iconType?: string;
  isLoading?: boolean;
}
export const ProgressIndicator: FunctionComponent<ProgressIndicatorProps> = ({
  iconType,
  isLoading = true,
  title,
  color = isLoading ? 'primary' : 'success',
  ...rest
}) => {
  return (
    <EuiCallOut
      title={title}
      color={color}
      iconType={isLoading ? EuiLoadingSpinner : iconType}
      {...rest}
    />
  );
};
