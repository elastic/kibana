/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useAlertExceptionActions } from './use_add_exception_actions';
import { useUserData } from '../../user_info';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';

jest.mock('../../user_info');
const mockUseUserData = useUserData as jest.Mock;

jest.mock('../../../../common/components/user_privileges');
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

jest.mock('../../../../exceptions/hooks/use_endpoint_exceptions_capability');
const mockUseEndpointExceptionsCapability = useEndpointExceptionsCapability as jest.Mock;

describe('useAlertExceptionActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return both add rule exception and add endpoint exception menu items with all privileges', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: true }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: true } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);

    const { result } = renderHook(
      () => useAlertExceptionActions({ isEndpointAlert: true, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(2);
    expect(result.current.exceptionActionItems.map(({ key, disabled }) => [key, disabled])).toEqual(
      [
        ['add-endpoint-exception-menu-item', false],
        ['add-exception-menu-item', false],
      ]
    );
  });

  it('should disable adding endpoint exceptions when user has no endpoint exceptions ALL privilege', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: true }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: true } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(false);

    const { result } = renderHook(
      () => useAlertExceptionActions({ isEndpointAlert: true, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(2);
    expect(result.current.exceptionActionItems.map(({ key, disabled }) => [key, disabled])).toEqual(
      [
        ['add-endpoint-exception-menu-item', true],
        ['add-exception-menu-item', false],
      ]
    );
  });

  it('should disable adding endpoint exceptions when alert is not an endpoint alert', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: true }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: true } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAlertExceptionActions({ isEndpointAlert: false, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(2);
    expect(result.current.exceptionActionItems.map(({ key, disabled }) => [key, disabled])).toEqual(
      [
        ['add-endpoint-exception-menu-item', true],
        ['add-exception-menu-item', false],
      ]
    );
  });

  it('should disable adding rule exceptions when user has no security:ALL privilege', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: true }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: false } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);

    const { result } = renderHook(
      () => useAlertExceptionActions({ isEndpointAlert: true, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(2);
    expect(result.current.exceptionActionItems.map(({ key, disabled }) => [key, disabled])).toEqual(
      [
        ['add-endpoint-exception-menu-item', false],
        ['add-exception-menu-item', true],
      ]
    );
  });

  it('should disable adding rule exceptions when user has no index write privilege', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: false }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: true } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);

    const { result } = renderHook(
      () => useAlertExceptionActions({ isEndpointAlert: true, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(2);
    expect(result.current.exceptionActionItems.map(({ key, disabled }) => [key, disabled])).toEqual(
      [
        ['add-endpoint-exception-menu-item', false],
        ['add-exception-menu-item', true],
      ]
    );
  });

  it('should not return menu items when user has neither security:ALL nor endpoint exceptions ALL privilege', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: true }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: false } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(false);

    const { result } = renderHook(
      () => useAlertExceptionActions({ isEndpointAlert: true, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(0);
  });

  it('should not return menu items when user has neither index write and it is not an endpoint alert', () => {
    mockUseUserData.mockReturnValue([{ hasIndexWrite: false }]);
    mockUseUserPrivileges.mockReturnValue({ rulesPrivileges: { exceptions: { edit: true } } });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAlertExceptionActions({ isEndpointAlert: false, onAddExceptionTypeClick: jest.fn() }),
      { wrapper: TestProviders }
    );

    expect(result.current.exceptionActionItems.length).toEqual(0);
  });
});
