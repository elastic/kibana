/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ManageUserInfo, useUserInfo } from '.';
import type { Capabilities } from '@kbn/core/public';

import { useKibana } from '../../../common/lib/kibana';
import * as api from '../../containers/detection_engine/alerts/api';
import { TestProviders } from '../../../common/mock/test_providers';
import { UserPrivilegesProvider } from '../../../common/components/user_privileges/user_privileges_context';
import { sourcererSelectors } from '../../../common/store';
import { SECURITY_FEATURE_ID } from '../../../../common';

jest.mock('../../../common/lib/kibana');
jest.mock('../../containers/detection_engine/alerts/api');
jest.mock('../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

describe('useUserInfo', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              crud: true,
            },
          },
        },
      },
    });

    jest.spyOn(sourcererSelectors, 'signalIndexName').mockReturnValue(null);
  });
  it('returns default state', async () => {
    const { result } = renderHook(() => useUserInfo(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual({
      hasEncryptionKey: null,
      hasIndexManage: null,
      hasIndexMaintenance: null,
      hasIndexWrite: null,
      hasIndexRead: null,
      hasIndexUpdateDelete: null,
      isAuthenticated: null,
      isSignalIndexExists: null,
      loading: true,
      signalIndexName: null,
      signalIndexMappingOutdated: null,
    });
  });

  it('calls createSignalIndex if signal index template is outdated', async () => {
    const spyOnCreateSignalIndex = jest.spyOn(api, 'createSignalIndex');
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex').mockResolvedValueOnce({
      name: 'mock-signal-index',
      index_mapping_outdated: true,
    });
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <TestProviders>
        <UserPrivilegesProvider
          kibanaCapabilities={
            { [SECURITY_FEATURE_ID]: { show: true, crud: true } } as unknown as Capabilities
          }
        >
          <ManageUserInfo>{children}</ManageUserInfo>
        </UserPrivilegesProvider>
      </TestProviders>
    );

    renderHook(() => useUserInfo(), { wrapper });
    await waitFor(() => {
      expect(spyOnGetSignalIndex).toHaveBeenCalledTimes(2);
      expect(spyOnCreateSignalIndex).toHaveBeenCalledTimes(1);
    });
  });
});
