/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';
import type { CopyProps } from './actions/copy';
import type { FilterValueFnArgs, HoverActionComponentProps } from './actions/types';

const CopyButtonLazy = React.lazy(() => import('./actions/copy'));
export const getCopyButton = (props: CopyProps): ReactElement<CopyProps> => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <CopyButtonLazy {...props} />
    </React.Suspense>
  );
};

const FilterForValueButtonLazy = React.lazy(() => import('./actions/filter_for_value'));
export const getFilterForValueButton = (
  props: HoverActionComponentProps & FilterValueFnArgs
): ReactElement<HoverActionComponentProps & FilterValueFnArgs> => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <FilterForValueButtonLazy {...props} />
    </React.Suspense>
  );
};

const FilterOutValueButtonLazy = React.lazy(() => import('./actions/filter_out_value'));
export const getFilterOutValueButton = (
  props: HoverActionComponentProps & FilterValueFnArgs
): ReactElement<HoverActionComponentProps & FilterValueFnArgs> => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <FilterOutValueButtonLazy {...props} />
    </React.Suspense>
  );
};
