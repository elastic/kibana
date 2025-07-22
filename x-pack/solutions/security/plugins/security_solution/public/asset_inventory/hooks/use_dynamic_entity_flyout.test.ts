/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useDynamicEntityFlyout } from './use_dynamic_entity_flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../common/lib/kibana';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';
import {
  GenericEntityPanelKey,
  UserPanelKey,
  HostPanelKey,
  ServicePanelKey,
} from '../../flyout/entity_details/shared/constants';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../flyout/shared/hooks/use_on_expandable_flyout_close', () => ({
  useOnExpandableFlyoutClose: jest.fn(),
}));

describe('useDynamicEntityFlyout', () => {
  let openFlyoutMock: jest.Mock;
  let closeFlyoutMock: jest.Mock;
  let toastsMock: { addDanger: jest.Mock };
  let onFlyoutCloseMock: jest.Mock;

  beforeEach(() => {
    openFlyoutMock = jest.fn();
    closeFlyoutMock = jest.fn();
    toastsMock = { addDanger: jest.fn() };
    onFlyoutCloseMock = jest.fn();

    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: openFlyoutMock,
      closeFlyout: closeFlyoutMock,
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: { notifications: { toasts: toastsMock } },
    });
    (useOnExpandableFlyoutClose as jest.Mock).mockImplementation(({ callback }) => callback);
  });

  it('should open the flyout with correct params for a generic entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityDocId: '123',
        entityType: 'container',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openFlyoutMock).toHaveBeenCalledWith({
      right: {
        id: GenericEntityPanelKey,
        params: { entityDocId: '123', scopeId: 'scope1', contextId: 'context1' },
      },
    });
  });

  it('should open the flyout with correct params for a user entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'user',
        entityName: 'testUser',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openFlyoutMock).toHaveBeenCalledWith({
      right: {
        id: UserPanelKey,
        params: { userName: 'testUser', scopeId: 'scope1', contextId: 'context1' },
      },
    });
  });

  it('should open the flyout with correct params for a host entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'host',
        entityName: 'testHost',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openFlyoutMock).toHaveBeenCalledWith({
      right: {
        id: HostPanelKey,
        params: { hostName: 'testHost', scopeId: 'scope1', contextId: 'context1' },
      },
    });
  });

  it('should open the flyout with correct params for a service entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'service',
        entityName: 'testService',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openFlyoutMock).toHaveBeenCalledWith({
      right: {
        id: ServicePanelKey,
        params: { serviceName: 'testService', scopeId: 'scope1', contextId: 'context1' },
      },
    });
  });

  it('should show an error toast if entity name is missing for user, host, or service entities', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({ entityType: 'user' });
    });

    expect(toastsMock.addDanger).toHaveBeenCalled();
    expect(onFlyoutCloseMock).toHaveBeenCalled();
    expect(openFlyoutMock).not.toHaveBeenCalled();
  });

  it('should close the flyout when closeDynamicFlyout is called', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.closeDynamicFlyout();
    });

    expect(closeFlyoutMock).toHaveBeenCalled();
  });
});
