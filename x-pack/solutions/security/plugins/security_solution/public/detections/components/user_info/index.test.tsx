/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUserInfo } from '.';

import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock/test_providers';
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
    });
  });
});
