/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_FEATURE_ID } from '../../common/constants';
import { useCanWriteAlertZero } from './use_can_write_alertzero';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);

describe('useCanWriteAlertZero', () => {
  it('is true when the AlertZero write capability is granted', () => {
    mockUseKibana.mockReturnValue({
      services: { application: { capabilities: { [ALERTZERO_FEATURE_ID]: { write: true } } } },
    } as never);

    const { result } = renderHook(() => useCanWriteAlertZero());
    expect(result.current).toBe(true);
  });

  it('is false when the AlertZero write capability is missing', () => {
    mockUseKibana.mockReturnValue({
      services: { application: { capabilities: { [ALERTZERO_FEATURE_ID]: { show: true } } } },
    } as never);

    const { result } = renderHook(() => useCanWriteAlertZero());
    expect(result.current).toBe(false);
  });
});
