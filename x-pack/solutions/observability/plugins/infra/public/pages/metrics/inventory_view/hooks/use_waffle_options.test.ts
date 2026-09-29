/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import type { WaffleOptionsState } from './use_waffle_options';
import { useWaffleOptions } from './use_waffle_options';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';

vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('../../../../alerting/use_alert_prefill');
vi.mock('../../../../hooks/use_is_pod_schema_selector_enabled', () => {
  const mocked = {
    useIsPodSchemaSelectorEnabled: vi.fn(() => false),
  };
  return { ...mocked, default: mocked };
});

const updateTopbarMenuVisibilityBySchema = vi.fn();
vi.mock('../../../../containers/ml/infra_ml_capabilities', () => {
  const mocked = {
    useInfraMLCapabilitiesContext: () => ({
      updateTopbarMenuVisibilityBySchema,
    }),
  };
  return { ...mocked, default: mocked };
});

const mockUseUrlState = useUrlState as MockedFunction<typeof useUrlState>;
const mockUseAlertPrefillContext = useAlertPrefillContext as MockedFunction<
  typeof useAlertPrefillContext
>;

// Mock useUrlState hook
vi.mock('react-router-dom', () => {
  const mocked = {
    useHistory: () => ({
      location: '',
      replace: () => {},
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_inventory_views', () => {
  const mocked = {
    useInventoryViewsContext: () => ({
      currentView: undefined,
    }),
  };
  return { ...mocked, default: mocked };
});

const renderUseWaffleOptionsHook = () => renderHook(() => useWaffleOptions());

const setPrefillState = vi.fn((args: Partial<WaffleOptionsState>) => args);

describe('useWaffleOptions', () => {
  beforeEach(() => {
    updateTopbarMenuVisibilityBySchema.mockClear();
    mockUseAlertPrefillContext.mockReturnValue({
      inventoryPrefill: {
        setPrefillState,
      },
    } as unknown as ReturnType<typeof useAlertPrefillContext>);

    mockUseUrlState.mockReturnValue([{}, vi.fn()]);
  });

  it('syncs Anomaly detection topbar visibility from preferredSchema on mount and change', () => {
    mockUseUrlState.mockReturnValue([{ preferredSchema: 'semconv' }, vi.fn()]);

    const { result } = renderUseWaffleOptionsHook();

    expect(updateTopbarMenuVisibilityBySchema).toHaveBeenCalledWith('semconv');

    act(() => {
      result.current.changePreferredSchema('ecs');
    });

    expect(updateTopbarMenuVisibilityBySchema).toHaveBeenLastCalledWith('ecs');
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleOptionsHook();

    const newOptions = {
      nodeType: 'pod',
      metric: { type: 'memory' },
      customMetrics: [
        {
          type: 'custom',
          id: "i don't want to bother to copy and paste an actual uuid so instead i'm going to smash my keyboard skjdghsjodkyjheurvjnsgn",
          aggregation: 'avg',
          field: 'hey.system.are.you.good',
        },
      ],
      accountId: '123456789012',
      region: 'us-east-1',
    } as WaffleOptionsState;
    act(() => {
      mockUseUrlState.mockReturnValue([newOptions, vi.fn()]);
      result.current.changeNodeType(newOptions.nodeType);
    });

    rerender();
    expect(setPrefillState).toHaveBeenCalledWith(
      expect.objectContaining({ nodeType: newOptions.nodeType })
    );

    act(() => {
      mockUseUrlState.mockReturnValue([newOptions, vi.fn()]);
      result.current.changeMetric(newOptions.metric);
    });

    rerender();
    expect(setPrefillState).toHaveBeenCalledWith(
      expect.objectContaining({ metric: newOptions.metric })
    );

    act(() => {
      mockUseUrlState.mockReturnValue([newOptions, vi.fn()]);
      result.current.changeCustomMetrics(newOptions.customMetrics);
    });

    rerender();
    expect(setPrefillState).toHaveBeenCalledWith(
      expect.objectContaining({ customMetrics: newOptions.customMetrics })
    );

    act(() => {
      mockUseUrlState.mockReturnValue([newOptions, vi.fn()]);
      result.current.changeAccount(newOptions.accountId);
    });

    rerender();
    expect(setPrefillState).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: newOptions.accountId })
    );

    act(() => {
      mockUseUrlState.mockReturnValue([newOptions, vi.fn()]);
      result.current.changeRegion(newOptions.region);
    });

    rerender();
    expect(setPrefillState).toHaveBeenCalledWith(
      expect.objectContaining({ region: newOptions.region })
    );
  });
});
