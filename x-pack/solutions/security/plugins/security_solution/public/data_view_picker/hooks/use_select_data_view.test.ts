/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useSelectDataView } from './use_select_data_view';

describe('useSelectDataView', () => {
  it('should render', () => {
    renderHook(
      () => {
        return useSelectDataView();
      },
      { wrapper: TestProviders }
    );
  });
});
