/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import { securityMock } from '@kbn/security-plugin/public/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';

import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { KibanaServices, useCurrentUser, useKibana } from '../../../lib/kibana';
import { licenseService } from '../../../hooks/use_license';
import { useEndpointPrivileges } from './use_endpoint_privileges';
import { getEndpointPrivilegesInitialStateMock } from './mocks';
import { getEndpointPrivilegesInitialState } from './utils';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';

vi.mock('../../../lib/kibana');
vi.mock('../../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: vi.fn(),
    isEnterprise: vi.fn(() => true),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const useKibanaMock = useKibana as Mocked<typeof useKibana>;
const licenseServiceMock = licenseService as Mocked<typeof licenseService>;
const KibanaServicesMock = KibanaServices as Mocked<typeof KibanaServices>;

describe('When using useEndpointPrivileges hook', () => {
  let authenticatedUser: AuthenticatedUser;
  let result: RenderHookResult<EndpointPrivileges, void>['result'];
  let unmount: ReturnType<typeof renderHook>['unmount'];
  let render: () => RenderHookResult<EndpointPrivileges, void>;

  beforeEach(() => {
    authenticatedUser = securityMock.createMockAuthenticatedUser({
      roles: ['superuser'],
    });

    (useCurrentUser as Mock).mockReturnValue(authenticatedUser);
    useKibanaMock().services.fleet!.authz = createFleetAuthzMock();
    useKibanaMock().services.application.capabilities = {
      catalogue: {},
      management: {},
      navLinks: {},
      [SECURITY_FEATURE_ID]: {
        crud: true,
        show: true,
      },
    };
    KibanaServicesMock.getBuildFlavor.mockReturnValue('traditional');

    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    render = () => {
      const hookRenderResponse = renderHook(() => useEndpointPrivileges());
      ({ result, unmount } = hookRenderResponse);
      return hookRenderResponse;
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    unmount();
  });

  it('should return `loading: true` while retrieving privileges', async () => {
    (useCurrentUser as Mock).mockReturnValue(null);

    const { rerender } = render();

    expect(result.current).toEqual(getEndpointPrivilegesInitialState());

    // Make user service available
    (useCurrentUser as Mock).mockReturnValue(authenticatedUser);
    rerender();

    expect(result.current).toEqual({
      ...getEndpointPrivilegesInitialStateMock(),
    });
  });

  it('should return initial state when no user authz', async () => {
    (useCurrentUser as Mock).mockReturnValue({});

    render();
    expect(result.current).toEqual({ ...getEndpointPrivilegesInitialState(), loading: false });
  });
});
