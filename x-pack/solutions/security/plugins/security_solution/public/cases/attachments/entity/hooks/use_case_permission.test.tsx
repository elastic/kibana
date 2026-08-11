/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions } from '@kbn/cases-plugin/common';
import { renderHook } from '@testing-library/react';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { noCasesPermissions } from '../../../../cases_test_utils';
import { APP_ID } from '../../../../../common/constants';
import { useEntityCasePermissions } from './use_case_permission';

jest.mock('../../../../common/lib/kibana');

describe('useEntityCasePermissions', () => {
  const mockedUseKibana = mockUseKibana();
  const mockCanUseCases = jest.fn();

  beforeEach(() => {
    mockedUseKibana.services.cases.helpers.canUseCases = mockCanUseCases;
  });

  const renderWithPermissions = (permissions: Partial<CasesPermissions>) => {
    mockCanUseCases.mockReturnValue({ ...noCasesPermissions(), ...permissions });
    return renderHook(() => useEntityCasePermissions()).result;
  };

  it('calls canUseCases scoped to the securitySolution owner', () => {
    renderWithPermissions({});
    expect(mockCanUseCases).toHaveBeenCalledWith([APP_ID]);
  });

  it('allows adding to a case when the user can update existing cases', () => {
    const { current } = renderWithPermissions({ update: true, createComment: true });
    expect(current.canAddToCase).toEqual(true);
  });

  it('allows adding to a case when the user can create cases', () => {
    const { current } = renderWithPermissions({ create: true, createComment: true });
    expect(current.canAddToCase).toEqual(true);
  });

  it('does not allow adding to a case without createComment', () => {
    const { current } = renderWithPermissions({
      create: true,
      createComment: false,
      update: true,
    });
    expect(current.canAddToCase).toEqual(false);
  });

  it('does not allow adding to a case without create or update', () => {
    const { current } = renderWithPermissions({});
    expect(current).toEqual({
      canAddToCase: false,
    });
  });
});
