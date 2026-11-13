/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useDynamicEntityFlyout } from './use_dynamic_entity_flyout';
import { useKibana } from '../../common/lib/kibana';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: jest.fn(),
}));

describe('useDynamicEntityFlyout', () => {
  let openHostFlyoutMock: jest.Mock;
  let openUserFlyoutMock: jest.Mock;
  let openServiceFlyoutMock: jest.Mock;
  let openGenericEntityFlyoutMock: jest.Mock;
  let toastsMock: { addDanger: jest.Mock };
  let onFlyoutCloseMock: jest.Mock;

  beforeEach(() => {
    openHostFlyoutMock = jest.fn();
    openUserFlyoutMock = jest.fn();
    openServiceFlyoutMock = jest.fn();
    openGenericEntityFlyoutMock = jest.fn();
    toastsMock = { addDanger: jest.fn() };
    onFlyoutCloseMock = jest.fn();

    (useFlyoutApi as jest.Mock).mockReturnValue({
      openHostFlyout: openHostFlyoutMock,
      openUserFlyout: openUserFlyoutMock,
      openServiceFlyout: openServiceFlyoutMock,
      openGenericEntityFlyout: openGenericEntityFlyoutMock,
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: { notifications: { toasts: toastsMock } },
    });
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

  describe('closing', () => {
    const createHandle = () => {
      let resolveOnClose: () => void = () => {};
      const onClose = new Promise<void>((resolve) => {
        resolveOnClose = resolve;
      });
      const close = jest.fn(() => resolveOnClose());
      return { close, onClose, resolveOnClose: () => resolveOnClose() };
    };

    const openHost = (
      result: { current: ReturnType<typeof useDynamicEntityFlyout> },
      entityName: string
    ) =>
      act(() => {
        result.current.openDynamicFlyout({
          entityType: 'host',
          entityName,
          entityId: entityName,
          scopeId: 'scope1',
        });
      });

    it('closes the opened flyout when closeDynamicFlyout is called', async () => {
      const handle = createHandle();
      openHostFlyoutMock.mockReturnValue(handle);
      const { result } = renderHook(() =>
        useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
      );

      openHost(result, 'host-1');
      act(() => {
        result.current.closeDynamicFlyout();
      });

      expect(handle.close).toHaveBeenCalledTimes(1);
      await act(async () => {
        await handle.onClose;
      });
      // Closed by the table itself, which already clears its own row highlight.
      expect(onFlyoutCloseMock).not.toHaveBeenCalled();
    });

    it('does nothing when closeDynamicFlyout is called with no open flyout', () => {
      const { result } = renderHook(() =>
        useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
      );

      expect(() => result.current.closeDynamicFlyout()).not.toThrow();
    });

    it('calls onFlyoutClose when the user closes the flyout', async () => {
      const handle = createHandle();
      openHostFlyoutMock.mockReturnValue(handle);
      const { result } = renderHook(() =>
        useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
      );

      openHost(result, 'host-1');
      await act(async () => {
        handle.resolveOnClose();
        await handle.onClose;
      });

      expect(onFlyoutCloseMock).toHaveBeenCalledTimes(1);
    });

    it('ignores the close of a flyout replaced by a newer one', async () => {
      const first = createHandle();
      const second = createHandle();
      openHostFlyoutMock.mockReturnValueOnce(first).mockReturnValueOnce(second);
      const { result } = renderHook(() =>
        useDynamicEntityFlyout({ onFlyoutClose: onFlyoutCloseMock })
      );

      openHost(result, 'host-1');
      openHost(result, 'host-2');
      await act(async () => {
        first.resolveOnClose();
        await first.onClose;
      });

      expect(onFlyoutCloseMock).not.toHaveBeenCalled();

      act(() => {
        result.current.closeDynamicFlyout();
      });
      expect(second.close).toHaveBeenCalledTimes(1);
      expect(first.close).not.toHaveBeenCalled();
    });
  });
});
