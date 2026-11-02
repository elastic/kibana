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
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../flyout/shared/hooks/use_on_expandable_flyout_close', () => ({
  useOnExpandableFlyoutClose: jest.fn(),
}));

jest.mock('../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: jest.fn(),
}));

jest.mock('../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: jest.fn(),
}));

describe('useDynamicEntityFlyout', () => {
  let openFlyoutMock: jest.Mock;
  let closeFlyoutMock: jest.Mock;
  let openHostFlyoutMock: jest.Mock;
  let openUserFlyoutMock: jest.Mock;
  let openServiceFlyoutMock: jest.Mock;
  let openGenericEntityFlyoutMock: jest.Mock;
  let toastsMock: { addDanger: jest.Mock };
  let onFlyoutCloseMock: jest.Mock;

  beforeEach(() => {
    openFlyoutMock = jest.fn();
    closeFlyoutMock = jest.fn();
    openHostFlyoutMock = jest.fn();
    openUserFlyoutMock = jest.fn();
    openServiceFlyoutMock = jest.fn();
    openGenericEntityFlyoutMock = jest.fn();
    toastsMock = { addDanger: jest.fn() };
    onFlyoutCloseMock = jest.fn();

    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: openFlyoutMock,
      closeFlyout: closeFlyoutMock,
    });
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);
    (useFlyoutApi as jest.Mock).mockReturnValue({
      openHostFlyout: openHostFlyoutMock,
      openUserFlyout: openUserFlyoutMock,
      openServiceFlyout: openServiceFlyoutMock,
      openGenericEntityFlyout: openGenericEntityFlyoutMock,
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: { notifications: { toasts: toastsMock } },
    });
    (useOnExpandableFlyoutClose as jest.Mock).mockImplementation(({ callback }) => callback);
  });

  it('should open the generic entity flyout for a generic entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityDocId: '123',
        entityId: '123',
        entityType: 'container',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openGenericEntityFlyoutMock).toHaveBeenCalledWith({
      entityDocId: '123',
      entityId: '123',
      scopeId: 'scope1',
      contextID: 'context1',
      origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
    });
  });

  it('should open the user flyout for a user entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'user',
        entityName: 'testUser',
        entityId: '123',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openUserFlyoutMock).toHaveBeenCalledWith({
      userName: 'testUser',
      entityId: '123',
      scopeId: 'scope1',
      contextID: 'context1',
      origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
    });
  });

  it('should open the host flyout for a host entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'host',
        entityName: 'testHost',
        entityId: '123',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openHostFlyoutMock).toHaveBeenCalledWith({
      hostName: 'testHost',
      entityId: '123',
      scopeId: 'scope1',
      contextID: 'context1',
      origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
    });
  });

  it('should open the service flyout for a service entity', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityType: 'service',
        entityName: 'testService',
        entityId: '123',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openServiceFlyoutMock).toHaveBeenCalledWith({
      serviceName: 'testService',
      entityId: '123',
      scopeId: 'scope1',
      contextID: 'context1',
      origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
    });
  });

  it('should open the legacy generic entity panel when the new flyout is disabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({
        entityDocId: '123',
        entityId: '123',
        entityType: 'container',
        scopeId: 'scope1',
        contextId: 'context1',
      });
    });

    expect(openFlyoutMock).toHaveBeenCalledWith({
      right: {
        id: 'generic-entity-panel',
        params: {
          entityDocId: '123',
          entityId: '123',
          contextID: 'context1',
          scopeId: 'scope1',
          isEngineMetadataExist: true,
        },
      },
    });
    expect(openGenericEntityFlyoutMock).not.toHaveBeenCalled();
  });

  it('should show an error toast if entity name is missing for user, host, or service entities', () => {
    const { result } = renderHook(() =>
      useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
    );

    act(() => {
      result.current.openDynamicFlyout({ entityType: 'user', entityId: '123', scopeId: 'scope1' });
    });

    expect(toastsMock.addDanger).toHaveBeenCalled();
    expect(onFlyoutCloseMock).toHaveBeenCalled();
    expect(openUserFlyoutMock).not.toHaveBeenCalled();
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
