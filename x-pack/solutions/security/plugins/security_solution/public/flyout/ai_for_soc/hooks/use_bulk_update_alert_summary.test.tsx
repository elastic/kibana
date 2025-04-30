/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react';
import { useBulkUpdateAlertSummary } from './use_bulk_update_alert_summary';
import { useAssistantContext } from '@kbn/elastic-assistant';

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));

describe('useBulkUpdateAlertSummary', () => {
  const mockHttp = {
    fetch: jest.fn(),
  };
  const mockToasts = {
    addDanger: jest.fn(),
    addError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      http: mockHttp,
      toasts: mockToasts,
    });
  });

  it('should call the API with the correct parameters', async () => {
    const { result } = renderHook(() => useBulkUpdateAlertSummary());

    const alertSummary = { update: [], create: [] };
    mockHttp.fetch.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.bulkUpdate({ alertSummary });
    });

    expect(mockHttp.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(alertSummary),
      })
    );
  });

  it('should handle API errors and show a toast message', async () => {
    const { result } = renderHook(() => useBulkUpdateAlertSummary());

    const alertSummary = { update: [], create: [] };
    const errorMessage = 'API error';
    mockHttp.fetch.mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      await result.current.bulkUpdate({ alertSummary });
    });

    expect(mockToasts.addDanger).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update alert summaries')
    );
  });

  it('should abort the request when abortStream is called', () => {
    const { result } = renderHook(() => useBulkUpdateAlertSummary());

    act(() => {
      result.current.abortStream();
    });

    expect(mockHttp.fetch).not.toHaveBeenCalled();
  });
});
