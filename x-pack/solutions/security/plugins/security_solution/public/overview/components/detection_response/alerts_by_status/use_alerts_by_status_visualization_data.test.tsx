/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { useAlertsByStatusVisualizationData } from './use_alerts_by_status_visualization_data';

vi.mock(
  '../../../../common/components/visualization_actions/use_visualization_response',
  async () => {
    const mocked = {
      ...(await vi.importActual(
        '../../../../common/components/visualization_actions/use_visualization_response'
      )),
      useVisualizationResponse: (
        await vi.importActual(
          '../../../../common/components/visualization_actions/use_visualization_response.mock'
        )
      ).useVisualizationResponseMock.create(),
    };
    return { ...mocked, default: mocked };
  }
);

describe('useAlertsByStatusVisualizationData', () => {
  it('should return visualization alerts count', () => {
    const { result } = renderHook(() => useAlertsByStatusVisualizationData());

    expect(result.current.open).toEqual(1);
    expect(result.current.acknowledged).toEqual(1);
    expect(result.current.closed).toEqual(1);
    expect(result.current.total).toEqual(3);
  });
});
