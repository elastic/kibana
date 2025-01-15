/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';
import {
  acknowledgedAlertsVisualizationId,
  closedAlertsVisualizationId,
  openAlertsVisualizationId,
  useAlertsByStatusVisualizationData,
} from './use_alerts_by_status_visualization_data';

jest.mock('../../../../common/components/visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: jest.fn(),
}));

describe('useAlertsByStatusVisualizationData', () => {
  beforeAll(() => {
    (useVisualizationResponse as jest.Mock).mockImplementation(
      ({ visualizationId }: { visualizationId: string }) => {
        const mockCount = {
          [openAlertsVisualizationId]: { responses: [{ hits: { total: 10 } }] },
          [acknowledgedAlertsVisualizationId]: { responses: [{ hits: { total: 20 } }] },
          [closedAlertsVisualizationId]: { responses: [{ hits: { total: 30 } }] },
        };
        return mockCount[visualizationId];
      }
    );
  });
  it('should return visualization alerts count', () => {
    const { result } = renderHook(() => useAlertsByStatusVisualizationData());
    expect(result.current.open).toEqual(10);
    expect(result.current.acknowledged).toEqual(20);
    expect(result.current.closed).toEqual(30);
    expect(result.current.total).toEqual(60);
  });
});
