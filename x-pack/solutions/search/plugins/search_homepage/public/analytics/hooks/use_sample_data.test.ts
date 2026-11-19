/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '../../hooks/use_kibana';
import { useSampleData } from './use_sample_data';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('useSampleData', () => {
  const setup = () => {
    const { http, notifications } = coreMock.createStart();
    mockUseKibana.mockReturnValue({ services: { http, notifications } });
    const { result } = renderHook(() => useSampleData());

    return { result, http, toasts: notifications.toasts };
  };

  it('installs the generated clickstream events through the plugin route', async () => {
    const { result, http, toasts } = setup();
    http.post.mockResolvedValue({ status: 'installed' });

    let isInstalled = false;
    await act(async () => {
      isInstalled = await result.current.install('clickstream');
    });

    expect(isInstalled).toBe(true);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/internal/search_homepage/analytics/sample_events');
    expect(http.get).not.toHaveBeenCalled();
    expect(toasts.addError).not.toHaveBeenCalled();
    expect(result.current.isInstalling).toBe(false);
  });

  it('is installing until the request settles', async () => {
    const { result, http } = setup();
    let finish: () => void = () => {};
    http.post.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.install('clickstream');
    });
    expect(result.current.isInstalling).toBe(true);

    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.isInstalling).toBe(false);
  });

  it('reports the error and resolves false when the clickstream install fails', async () => {
    const { result, http, toasts } = setup();
    const error = new Error('Forbidden');
    http.post.mockRejectedValue(error);

    let isInstalled = true;
    await act(async () => {
      isInstalled = await result.current.install('clickstream');
    });

    expect(isInstalled).toBe(false);
    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to install sample events',
    });
    expect(result.current.isInstalling).toBe(false);
  });

  it('installs a Kibana sample data set that is not installed yet', async () => {
    const { result, http, toasts } = setup();
    http.get.mockResolvedValue([{ id: 'ecommerce', status: 'not_installed' }]);
    http.post.mockResolvedValue({});

    let isInstalled = false;
    await act(async () => {
      isInstalled = await result.current.install('ecommerce');
    });

    expect(isInstalled).toBe(true);
    expect(http.post).toHaveBeenCalledWith('/api/sample_data/ecommerce');
    expect(toasts.addError).not.toHaveBeenCalled();
    expect(result.current.isInstalling).toBe(false);
  });

  it('does not reinstall a Kibana sample data set that is already installed', async () => {
    const { result, http } = setup();
    http.get.mockResolvedValue([{ id: 'ecommerce', status: 'installed' }]);

    let isInstalled = false;
    await act(async () => {
      isInstalled = await result.current.install('ecommerce');
    });

    expect(isInstalled).toBe(true);
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([
    ['the Kibana sample data install fails', { failGet: false }],
    ['the installed Kibana sample data sets cannot be read', { failGet: true }],
  ])('reports the error and resolves false when %s', async (_, { failGet }) => {
    const { result, http, toasts } = setup();
    const error = new Error('request failed');
    if (failGet) {
      http.get.mockRejectedValue(error);
    } else {
      http.get.mockResolvedValue([]);
      http.post.mockRejectedValue(error);
    }

    let isInstalled = true;
    await act(async () => {
      isInstalled = await result.current.install('ecommerce');
    });

    expect(isInstalled).toBe(false);
    expect(http.post).toHaveBeenCalledTimes(failGet ? 0 : 1);
    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to install sample events',
    });
    expect(result.current.isInstalling).toBe(false);
  });
});
