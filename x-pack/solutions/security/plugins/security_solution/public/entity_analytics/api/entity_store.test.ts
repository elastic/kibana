/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';

import { useEntityStoreRoutes } from './entity_store';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { WATCHLISTS_PREBUILT_INSTALL_URL } from '../../../common/entity_analytics/watchlists/constants';

jest.mock('../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const mockFetch = jest.fn();
const useKibanaMock = useKibana as jest.Mock;

describe('useEntityStoreRoutes — executionContext propagation to prebuilt watchlist install', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        http: { fetch: mockFetch },
        notifications: { toasts: { addWarning: jest.fn() } },
      },
    });
    mockFetch.mockResolvedValue({ acknowledged: true });
  });

  it('threads context into the prebuilt watchlist install request when installEntityStore is called', async () => {
    const { result } = renderHook(() => useEntityStoreRoutes());

    const context = { name: 'entity-store-install', id: 'wizard-step-2' };
    await result.current.installEntityStore(context);

    expect(mockFetch).toHaveBeenCalledWith(
      WATCHLISTS_PREBUILT_INSTALL_URL,
      expect.objectContaining({ context })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.public.INSTALL,
      expect.objectContaining({ context })
    );
  });

  it('threads context into the prebuilt watchlist install request when startEntityStore is called', async () => {
    const { result } = renderHook(() => useEntityStoreRoutes());

    const context = { name: 'entity-store-start', id: 'panel-a' };
    await result.current.startEntityStore(context);

    expect(mockFetch).toHaveBeenCalledWith(
      WATCHLISTS_PREBUILT_INSTALL_URL,
      expect.objectContaining({ context })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.public.START,
      expect.objectContaining({ context })
    );
  });

  it('does not fail when installEntityStore is called without context', async () => {
    const { result } = renderHook(() => useEntityStoreRoutes());

    await result.current.installEntityStore();

    expect(mockFetch).toHaveBeenCalledWith(
      WATCHLISTS_PREBUILT_INSTALL_URL,
      expect.objectContaining({ context: undefined })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.public.INSTALL,
      expect.objectContaining({ context: undefined })
    );
  });
});
