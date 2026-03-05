/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { useAllExceptionLists } from '.';
import { findRuleExceptionReferences } from '../../../detection_engine/rule_management/api/api';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../detection_engine/rule_management/api/api', () => ({
  findRuleExceptionReferences: jest.fn(),
}));
jest.mock('../../../common/components/user_privileges');

const findRuleExceptionReferencesMock = findRuleExceptionReferences as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('useAllExceptionLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReturnValue({
      rulesPrivileges: { rules: { read: true } },
    });
  });

  it('calls findRuleExceptionReferences with list descriptors when canReadRules is true and populates rules per list', async () => {
    const list1 = { ...getExceptionListSchemaMock(), id: 'id-1', list_id: 'list_1' };
    const list2 = { ...getExceptionListSchemaMock(), id: 'id-2', list_id: 'list_2' };
    const exceptionLists = [list1, list2];

    const refRule1 = {
      name: 'Rule One',
      id: 'rule-id-1',
      rule_id: 'rule_1',
      exception_lists: [],
    };
    const refRule2 = {
      name: 'Rule Two',
      id: 'rule-id-2',
      rule_id: 'rule_2',
      exception_lists: [],
    };

    findRuleExceptionReferencesMock.mockResolvedValue({
      references: [
        { list_1: { ...list1, referenced_rules: [refRule1] } },
        { list_2: { ...list2, referenced_rules: [refRule2] } },
      ],
    });

    const { result } = renderHook(() => useAllExceptionLists({ exceptionLists }));

    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });

    expect(findRuleExceptionReferencesMock).toHaveBeenCalledTimes(1);
    expect(findRuleExceptionReferencesMock).toHaveBeenCalledWith({
      lists: [
        { id: list1.id, listId: list1.list_id, namespaceType: list1.namespace_type },
        { id: list2.id, listId: list2.list_id, namespaceType: list2.namespace_type },
      ],
      signal: expect.any(AbortSignal),
    });

    const [, exceptions, exceptionsListInfo] = result.current;
    expect(exceptions).toHaveLength(2);
    expect(exceptionsListInfo['id-1'].rules).toEqual([
      {
        name: refRule1.name,
        id: refRule1.id,
        rule_id: refRule1.rule_id,
        exceptions_list: refRule1.exception_lists,
      },
    ]);
    expect(exceptionsListInfo['id-2'].rules).toEqual([
      {
        name: refRule2.name,
        id: refRule2.id,
        rule_id: refRule2.rule_id,
        exceptions_list: refRule2.exception_lists,
      },
    ]);
  });

  it('does not call findRuleExceptionReferences when canReadRules is false', async () => {
    useUserPrivilegesMock.mockReturnValue({
      rulesPrivileges: { rules: { read: false } },
    });

    const list1 = { ...getExceptionListSchemaMock(), id: 'id-1', list_id: 'list_1' };
    const exceptionLists = [list1];

    const { result } = renderHook(() => useAllExceptionLists({ exceptionLists }));

    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });

    expect(findRuleExceptionReferencesMock).not.toHaveBeenCalled();
    const [, exceptions, exceptionsListInfo] = result.current;
    expect(exceptions).toHaveLength(1);
    expect(exceptionsListInfo['id-1'].rules).toEqual([]);
  });

  it('sets loading false and empty state when exceptionLists is empty', async () => {
    findRuleExceptionReferencesMock.mockResolvedValue({ references: [] });

    const exceptionLists: ExceptionListSchema[] = [];
    const { result } = renderHook(() => useAllExceptionLists({ exceptionLists }));

    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });

    expect(findRuleExceptionReferencesMock).not.toHaveBeenCalled();
    const [loading, exceptions, exceptionsListInfo] = result.current;
    expect(loading).toBe(false);
    expect(exceptions).toEqual([]);
    expect(exceptionsListInfo).toEqual({});
  });
});
