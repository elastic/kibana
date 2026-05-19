/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { updateAlertStatus } from '../../../common/components/toolbar/bulk_actions/update_alerts';
import { getEsQueryFilter } from '../utils/get_es_query_filter';
import { useCloseAlertsFromExceptions } from './use_close_alerts';

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addSuccess: jest.fn(),
    addError: jest.fn(),
    addWarning: jest.fn(),
  }),
}));

jest.mock('../../../common/components/toolbar/bulk_actions/update_alerts', () => ({
  updateAlertStatus: jest.fn(),
}));

jest.mock('../utils/get_es_query_filter', () => ({
  getEsQueryFilter: jest.fn(),
}));

const mockedGetEsQueryFilter = getEsQueryFilter as jest.MockedFunction<typeof getEsQueryFilter>;
const mockedUpdateAlertStatus = updateAlertStatus as jest.MockedFunction<typeof updateAlertStatus>;

describe('useCloseAlertsFromExceptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEsQueryFilter.mockResolvedValue({
      bool: {
        filter: [],
        must: [],
        must_not: [],
        should: [],
      },
    });
    mockedUpdateAlertStatus.mockResolvedValue({
      updated: 1,
      version_conflicts: 0,
    });
  });

  it('prepares endpoint wildcard entries for bulk close query generation', async () => {
    const endpointException = getExceptionListItemSchemaMock({
      comments: [],
      list_id: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      entries: [
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'wildcard',
          value: 'C:\\Users\\*\\app.exe',
        },
      ],
    });

    const { result, rerender } = renderHook(() => useCloseAlertsFromExceptions());

    rerender();

    await act(async () => {
      await result.current[1]?.(['rule-1'], [endpointException], undefined, [
        '.alerts-security.alerts-default',
      ]);
    });

    expect(mockedGetEsQueryFilter.mock.calls[0][4]).toEqual([
      {
        ...endpointException,
        entries: [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value: 'C:\\\\Users\\\\*\\\\app.exe',
          },
        ],
      },
    ]);
  });
});
