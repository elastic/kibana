/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useDynamicEntityFlyout } from './use_dynamic_entity_flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana } from '../../common/lib/kibana';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../flyout/shared/hooks/use_on_expandable_flyout_close', () => {
      const mocked = {
      useOnExpandableFlyoutClose: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/hooks/use_is_new_flyout_enabled', () => {
      const mocked = {
      useIsNewFlyoutEnabled: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../flyout_v2/use_flyout_api', () => {
      const mocked = {
      useFlyoutApi: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useDynamicEntityFlyout', () => {
  let openFlyoutMock: Mock;
  let closeFlyoutMock: Mock;
  let openHostFlyoutMock: Mock;
  let openUserFlyoutMock: Mock;
  let openServiceFlyoutMock: Mock;
  let openGenericEntityFlyoutMock: Mock;
  let toastsMock: { addDanger: Mock };
  let onFlyoutCloseMock: Mock;

  beforeEach(() => {
    openFlyoutMock = vi.fn();
    closeFlyoutMock = vi.fn();
    openHostFlyoutMock = vi.fn();
    openUserFlyoutMock = vi.fn();
    openServiceFlyoutMock = vi.fn();
    openGenericEntityFlyoutMock = vi.fn();
    toastsMock = { addDanger: vi.fn() };
    onFlyoutCloseMock = vi.fn();

    (useExpandableFlyoutApi as Mock).mockReturnValue({
      openFlyout: openFlyoutMock,
      closeFlyout: closeFlyoutMock,
    });
    (useIsNewFlyoutEnabled as Mock).mockReturnValue(true);
    (useFlyoutApi as Mock).mockReturnValue({
      openHostFlyout: openHostFlyoutMock,
      openUserFlyout: openUserFlyoutMock,
      openServiceFlyout: openServiceFlyoutMock,
      openGenericEntityFlyout: openGenericEntityFlyoutMock,
    });
    (useKibana as Mock).mockReturnValue({
      services: { notifications: { toasts: toastsMock } },
    });
    (useOnExpandableFlyoutClose as Mock).mockImplementation(({ callback }) => callback);
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
    (useIsNewFlyoutEnabled as Mock).mockReturnValue(false);

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
