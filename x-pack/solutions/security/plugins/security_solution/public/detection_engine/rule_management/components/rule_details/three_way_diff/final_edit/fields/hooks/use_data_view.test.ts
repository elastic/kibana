/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDataView } from './use_data_view';
import { useKibana } from '../../../../../../../../common/lib/kibana';
import { useKibana as mockUseKibana } from '../../../../../../../../common/lib/kibana/__mocks__';

jest.mock('../../../../../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();
(useKibana as jest.Mock).mockReturnValue(mockedUseKibana);

describe('useDataView', () => {
  it('should set isLoading to false if a dataView already exists', async () => {
    const { result, rerender } = renderHook((props) => useDataView(props), {
      initialProps: { dataViewId: 'test-data-view-id' },
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.dataView).toEqual({ fields: [], title: '' });
    });
    expect(result.current.isLoading).toBe(false);

    rerender({ dataViewId: 'test-data-view-id' }); // Doesn't matter what is passed here, the internal dataViewId has been set
    expect(result.current.isLoading).toBe(false);
  });
});
