/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from '@emotion/styled';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 1;
`;

const MatrixLoaderComponent = () => (
  <StyledEuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="xl" />
    </EuiFlexItem>
  </StyledEuiFlexGroup>
);

export const MatrixLoader = React.memo(MatrixLoaderComponent);
