/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { buildDataTableRecord, type DataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useResponseActionsView } from './use_response_actions_view';
import { mockSearchHit } from '../../../flyout/document_details/shared/mocks/mock_search_hit';
import { useGetAutomatedActionList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { useUserPrivileges } from '../../../common/components/user_privileges';

const hit = buildDataTableRecord(mockSearchHit as EsHitRecord);
const hitWithoutAlertId = {
  ...hit,
  raw: {
    ...hit.raw,
    _id: undefined,
  },
  flattened: {
    ...hit.flattened,
    _id: undefined,
  },
} as DataTableRecord;

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../management/hooks/response_actions/use_get_automated_action_list');

const useGetAutomatedActionListMock = useGetAutomatedActionList as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('useResponseActionsView', () => {
  beforeEach(() => {
    useGetAutomatedActionListMock.mockReturnValue({
      data: [],
      isFetched: true,
    });
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canAccessEndpointActionsLogManagement: true,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the normal component', () => {
    const { result } = renderHook(() =>
      useResponseActionsView({
        hit,
      })
    );

    expect(result.current).toBeDefined();
    expect(useGetAutomatedActionListMock).toHaveBeenCalledWith(
      {
        alertIds: [hit.raw._id],
      },
      { enabled: true, isLive: false }
    );
  });

  it('returns empty content if alert id is missing', () => {
    const { result } = renderHook(() =>
      useResponseActionsView({
        hit: hitWithoutAlertId,
      })
    );

    expect(result.current).toBeDefined();
    expect(useGetAutomatedActionListMock).toHaveBeenCalledWith(
      {
        alertIds: [],
      },
      { enabled: false, isLive: false }
    );
  });

  it('does not get data with `useGetAutomatedActionList` if feature is enabled but user does not have privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: {
        canAccessEndpointActionsLogManagement: false,
      },
    });

    const { result } = renderHook(() =>
      useResponseActionsView({
        hit,
      })
    );

    expect(useGetAutomatedActionListMock).toHaveBeenCalledWith(
      {
        alertIds: [hit.raw._id],
      },
      { enabled: false, isLive: false }
    );

    expect(result.current).toMatchSnapshot();
  });
});
