/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useShouldShowGraph } from './use_should_show_graph';

jest.mock('../../../common/hooks/use_has_graph_visualization_license');
const mockUseHasGraphVisualizationLicense = useHasGraphVisualizationLicense as jest.Mock;

jest.mock('../../../entity_analytics/components/entity_store/hooks/use_entity_store');
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';
const mockUseEntityStoreStatus = useEntityStoreStatus as jest.Mock;

describe('useShouldShowGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: graph visualization feature is available
    mockUseHasGraphVisualizationLicense.mockReturnValue(true);
    // Default mock: entity store is running
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  });

  it('should return true when user has required license and entity store is running', () => {
    const hookResult = renderHook(() => useShouldShowGraph());

    expect(hookResult.result.current).toBe(true);
  });

  it('should return false when all conditions are met but env does not have required license', () => {
    mockUseHasGraphVisualizationLicense.mockReturnValue(false);

    const hookResult = renderHook(() => useShouldShowGraph());

    expect(hookResult.result.current).toBe(false);
  });

  it('should return false for shouldShowGraph when entity store is not running', () => {
    mockUseEntityStoreStatus.mockReturnValue({ data: { status: 'stopped' } });

    const hookResult = renderHook(() => useShouldShowGraph());

    expect(hookResult.result.current).toBe(false);
  });
});
