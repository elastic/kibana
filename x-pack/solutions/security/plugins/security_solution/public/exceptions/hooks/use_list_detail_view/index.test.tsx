/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useListDetailsView } from '.';
import { getListById, getListRules, updateList } from '../../api';

const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();
const mockServices = {
  http: {},
  notifications: { toasts: { addSuccess: mockAddSuccess } },
  application: { navigateToApp: jest.fn() },
};
const mockToasts = { addError: mockAddError, addSuccess: mockAddSuccess };
const mockApi = {
  exportExceptionList: jest.fn(),
  deleteExceptionList: jest.fn(),
  duplicateExceptionList: jest.fn(),
};
const mockInvalidateFetchRule = jest.fn();
const mockRulesPrivileges = { exceptions: { edit: true }, rules: { read: true } };

jest.mock('../../api');
jest.mock('../../utils/list.utils', () => ({
  isAnExceptionListItem: () => true,
  checkIfListCannotBeEdited: () => false,
}));
jest.mock('@kbn/securitysolution-list-hooks', () => ({
  useApi: () => mockApi,
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: mockServices }),
  useToasts: () => mockToasts,
}));
jest.mock('../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => ({ rulesPrivileges: mockRulesPrivileges }),
}));
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => false,
}));
jest.mock('../use_endpoint_exceptions_capability', () => ({
  useEndpointExceptionsCapability: () => true,
}));
jest.mock('../../../detection_engine/rule_management/api/hooks/use_fetch_rule_by_id_query', () => ({
  useInvalidateFetchRuleByIdQuery: () => mockInvalidateFetchRule,
}));

const list = {
  id: 'list-so-id',
  list_id: 'list-1',
  name: 'My list',
  description: 'My description',
  type: 'detection',
  namespace_type: 'single',
} as ExceptionListSchema;

const listDetails = { name: 'Renamed list', description: 'New description' };

describe('useListDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getListById as jest.Mock).mockResolvedValue(list);
    (getListRules as jest.Mock).mockResolvedValue([]);
  });

  const renderLoadedHook = async () => {
    const hook = renderHook(() => useListDetailsView('list-1'));
    await waitFor(() => expect(hook.result.current.list).toEqual(list));
    return hook;
  };

  describe('onEditListDetails', () => {
    it('resolves and updates the list when the save succeeds', async () => {
      const updated = { ...list, ...listDetails };
      (updateList as jest.Mock).mockResolvedValue(updated);
      const { result } = await renderLoadedHook();

      await act(async () => {
        await result.current.onEditListDetails(listDetails);
      });

      expect(result.current.list).toEqual(updated);
      expect(mockAddError).not.toHaveBeenCalled();
    });

    it('rejects, keeps the list and reports the error when the save fails', async () => {
      const error = new Error('Internal Server Error');
      (updateList as jest.Mock).mockRejectedValue(error);
      const { result } = await renderLoadedHook();

      await act(async () => {
        await expect(result.current.onEditListDetails(listDetails)).rejects.toThrow(error);
      });

      expect(result.current.list).toEqual(list);
      expect(mockAddError).toHaveBeenCalledWith(error, expect.anything());
    });

    it('resolves without calling the API when the list is not loaded', async () => {
      (getListById as jest.Mock).mockRejectedValue(new Error('boom'));
      const { result } = renderHook(() => useListDetailsView('list-1'));
      await waitFor(() => expect(result.current.viewerStatus).toBe(ViewerStatus.ERROR));

      await act(async () => {
        await result.current.onEditListDetails(listDetails);
      });

      expect(updateList).not.toHaveBeenCalled();
    });
  });
});
