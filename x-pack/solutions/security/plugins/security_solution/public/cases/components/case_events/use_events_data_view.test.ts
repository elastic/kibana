/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

const render = () =>
  renderHook((indexPattern: string = 'test') => useCaseEventsDataView(indexPattern), {
    wrapper: TestProviders,
  });

jest.mock('../../../common/lib/kibana');

const mockCreate = jest.fn();
const mockAddError = jest.fn();

const mockDataView = new DataView({
  spec: { id: '1', title: 'test' },
  fieldFormats: {} as FieldFormatsStart,
});

import * as kibanaLib from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { useCaseEventsDataView } from './use_events_data_view';

describe('useEventsDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (kibanaLib.useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: mockCreate,
          },
        },
        fieldFormats: {},
      },
    });
    (kibanaLib.useToasts as jest.Mock).mockReturnValue({
      addError: mockAddError,
    });
  });

  it('should return loading initially', () => {
    mockCreate.mockReturnValue(new Promise(() => {}));
    const { result } = render();
    expect(result.current.status).toBe('loading');
    expect(result.current.dataView).toBeUndefined();
  });

  it('should return ready and dataView when create resolves', async () => {
    mockCreate.mockResolvedValue(mockDataView);
    const { result } = render();
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
      expect(result.current.dataView).toBe(mockDataView);
    });
  });

  it('should return error and call addError when create rejects', async () => {
    const error = new Error('fail');
    mockCreate.mockRejectedValue(error);
    const { result } = render();
    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(mockAddError).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });

  it('should not call addError for AbortError', async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    mockCreate.mockRejectedValue(error);
    const { result } = render();
    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });
});
