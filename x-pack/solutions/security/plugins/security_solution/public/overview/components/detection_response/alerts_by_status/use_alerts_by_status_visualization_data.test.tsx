/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useAlertsByStatusVisualizationData } from './use_alerts_by_status_visualization_data';

jest.mock('../../../../common/components/visualization_actions/use_visualization_response', () => ({
  ...jest.requireActual(
    '../../../../common/components/visualization_actions/use_visualization_response'
  ),
  useVisualizationResponse: jest
    .requireActual(
      '../../../../common/components/visualization_actions/use_visualization_response.mock'
    )
    .useVisualizationResponseMock.create(),
}));

describe('useAlertsByStatusVisualizationData', () => {
  it('should return visualization alerts count', () => {
    const { result } = renderHook(() => useAlertsByStatusVisualizationData());

    expect(result.current.open).toEqual(1);
    expect(result.current.acknowledged).toEqual(1);
    expect(result.current.closed).toEqual(1);
    expect(result.current.total).toEqual(3);
  });
});
