/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  createPndProvidersWrapper,
  createPndTestServices,
} from '../../test_helpers/render_with_providers';
import { useCanManageAutonomy } from '.';

const renderCanManage = (pndCapabilities: Record<string, boolean>) =>
  renderHook(() => useCanManageAutonomy(), {
    wrapper: createPndProvidersWrapper({
      services: createPndTestServices({ pndCapabilities }),
    }),
  });

describe('useCanManageAutonomy', () => {
  it('is true when the pnd_manage_autonomy sub-feature granted the ui capability', () => {
    const { result } = renderCanManage({ manageAutonomy: true, show: true });

    expect(result.current).toBe(true);
  });

  it('is false when the capability is explicitly denied', () => {
    const { result } = renderCanManage({ manageAutonomy: false, show: true });

    expect(result.current).toBe(false);
  });

  it('is false for a read-only analyst, whose pnd block carries only `show`', () => {
    const { result } = renderCanManage({ show: true });

    expect(result.current).toBe(false);
  });

  it('is false when there is no application service at all, so the dial never unlocks by accident', () => {
    const { result } = renderHook(() => useCanManageAutonomy());

    expect(result.current).toBe(false);
  });
});
