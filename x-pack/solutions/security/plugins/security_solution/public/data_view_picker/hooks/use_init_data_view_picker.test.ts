/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useInitDataViewPicker } from './use_init_data_view_picker';

describe('useInitDataViewPicker', () => {
  it('should render', () => {
    renderHook(
      () => {
        return useInitDataViewPicker();
      },
      { wrapper: TestProviders }
    );
  });
});
