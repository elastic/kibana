/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  ADD_INTEGRATIONS_MENU_ITEM_TEST_ID,
  useAddIntegrationsMenuItem,
} from './use_add_integrations_menu_item';
import { useKibana } from '../../lib/kibana';
import { useAddIntegrationsUrl } from '../../hooks/use_add_integrations_url';
import { SECURITY_FEATURE_ID } from '../../../../common';

jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../hooks/use_add_integrations_url', () => ({
  useAddIntegrationsUrl: jest.fn(),
}));

const mockCapabilities = (capabilities: Record<string, unknown>) => {
  (useKibana as jest.Mock).mockReturnValue({
    services: {
      application: { capabilities },
    },
  });
};

describe('useAddIntegrationsMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      href: '/app/integrations/browse',
      onClick: jest.fn(),
    });
  });

  it('returns an overflow menu item when fleet is readable and not a Search AI Lake space', () => {
    mockCapabilities({ fleet: { read: true }, [SECURITY_FEATURE_ID]: { configurations: false } });

    const { result } = renderHook(() => useAddIntegrationsMenuItem());

    expect(result.current).toEqual(
      expect.objectContaining({
        id: 'addIntegrations',
        href: '/app/integrations/browse',
        overflow: true,
        testId: ADD_INTEGRATIONS_MENU_ITEM_TEST_ID,
      })
    );
  });

  it('returns undefined when the user cannot read fleet', () => {
    mockCapabilities({ fleet: { read: false }, [SECURITY_FEATURE_ID]: { configurations: false } });

    const { result } = renderHook(() => useAddIntegrationsMenuItem());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined for Search AI Lake configurations even when fleet is readable', () => {
    mockCapabilities({ fleet: { read: true }, [SECURITY_FEATURE_ID]: { configurations: true } });

    const { result } = renderHook(() => useAddIntegrationsMenuItem());

    expect(result.current).toBeUndefined();
  });
});
