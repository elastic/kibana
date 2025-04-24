/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';

export const FilterGroupLoading = () => {
  return (
    <EuiButton color="text" size="s">
      <EuiLoadingChart className="filter-group__loading" data-test-subj="filter-group__loading" />
    </EuiButton>
  );
};
