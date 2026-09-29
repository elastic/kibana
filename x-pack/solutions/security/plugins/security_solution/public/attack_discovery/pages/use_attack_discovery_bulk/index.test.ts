/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useAttackDiscoveryBulk } from '.';
import { TestProviders } from '../../../common/mock';
import * as appToastsModule from '../../../common/hooks/use_app_toasts';
import * as invalidateModule from '../use_find_attack_discoveries';
import * as kibanaModule from '../../../common/lib/kibana';

vi.mock('../../../common/hooks/use_app_toasts');
vi.mock('../use_find_attack_discoveries');
vi.mock('../../../common/lib/kibana');

const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const mockInvalidate = vi.fn();
const mockHttpPost = vi.fn();

const defaultIds = ['id1', 'id2'];
const defaultStatus = 'closed';
const defaultVisibility = 'shared';

const getHook = () =>
  renderHook(() => useAttackDiscoveryBulk(), {
    wrapper: TestProviders,
  });

describe('useAttackDiscoveryBulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (appToastsModule.useAppToasts as Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
    (invalidateModule.useInvalidateFindAttackDiscoveries as Mock).mockReturnValue(
      mockInvalidate
    );
    (kibanaModule.KibanaServices.get as Mock).mockReturnValue({
      http: { post: mockHttpPost },
    });
  });

  it('returns a mutation that succeeds and calls addSuccess', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: [{ id: 'foo' }] });
    const { result } = getHook();

    await act(async () => {
      await result.current.mutateAsync({
        ids: defaultIds,
        kibanaAlertWorkflowStatus: defaultStatus,
        visibility: defaultVisibility,
      });
    });

    expect(mockAddSuccess).toHaveBeenCalled();
  });

  it('includes with_replacements: false in the request body', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: [{ id: 'foo' }] });
    const { result } = getHook();

    await act(async () => {
      await result.current.mutateAsync({
        ids: defaultIds,
        kibanaAlertWorkflowStatus: defaultStatus,
        visibility: defaultVisibility,
      });
    });

    const call = mockHttpPost.mock.calls[mockHttpPost.mock.calls.length - 1];
    const options = call[1] || {};
    const parsed = JSON.parse(options.body ?? '{}');
    expect(parsed.update).toHaveProperty('with_replacements', false);
  });

  it('includes enable_field_rendering: true in the request body', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: [{ id: 'foo' }] });
    const { result } = getHook();

    await act(async () => {
      await result.current.mutateAsync({
        ids: defaultIds,
        kibanaAlertWorkflowStatus: defaultStatus,
        visibility: defaultVisibility,
      });
    });

    // public route should include `enable_field_rendering: true`
    const call = mockHttpPost.mock.calls[mockHttpPost.mock.calls.length - 1];
    const options = call[1] || {};
    const parsed = JSON.parse(options.body ?? '{}');
    expect(parsed.update).toHaveProperty('enable_field_rendering', true);
  });

  it('returns a mutation that calls addError on error', async () => {
    mockHttpPost.mockRejectedValueOnce(new Error('fail'));
    const { result } = getHook();

    await act(async () => {
      try {
        await result.current.mutateAsync({
          ids: defaultIds,
          kibanaAlertWorkflowStatus: defaultStatus,
          visibility: defaultVisibility,
        });
      } catch (e) {
        // expected error
      }
    });

    expect(mockAddError).toHaveBeenCalled();
  });

  it('calls invalidateFindAttackDiscoveries on success if status is set', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: [{ id: 'foo' }] });
    const { result } = getHook();

    await act(async () => {
      await result.current.mutateAsync({
        ids: defaultIds,
        kibanaAlertWorkflowStatus: defaultStatus,
        visibility: defaultVisibility,
      });
    });

    expect(mockInvalidate).toHaveBeenCalled();
  });
});
