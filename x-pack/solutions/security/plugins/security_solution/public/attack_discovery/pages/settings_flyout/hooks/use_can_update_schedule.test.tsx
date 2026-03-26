/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useCanUpdateSchedule } from './use_can_update_schedule';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useKibana } from '../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../common/constants';

jest.mock('../../../../common/lib/kibana');

describe('useCanUpdateSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: true,
            },
          },
        },
      },
    });
  });

  it('returns `true` if capability is granted', () => {
    const { result } = renderHook(() => useCanUpdateSchedule(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(true);
  });

  it('returns `false` if capability is not granted', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: false,
            },
          },
        },
      },
    });

    const { result } = renderHook(() => useCanUpdateSchedule(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(false);
  });

  it('returns `false` if capability is not specified', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {},
          },
        },
      },
    });

    const { result } = renderHook(() => useCanUpdateSchedule(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(false);
  });
});
