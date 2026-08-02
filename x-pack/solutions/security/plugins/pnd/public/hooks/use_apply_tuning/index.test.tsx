/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { API_VERSIONS, buildTuningApplyUrl } from '@kbn/pnd-common';
import type { ApplyTuningResponse } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import {
  createPndProvidersWrapper,
  createPndTestQueryClient,
  createPndTestServices,
} from '../../test_helpers/render_with_providers';
import { useApplyTuning } from '.';

const PROPOSAL_ID = 'alert-1';
const RULE_ID = '8f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8';

const applied: ApplyTuningResponse = { applied: true, proposalId: PROPOSAL_ID, ruleId: RULE_ID };

const defaultParams = {
  change: { enabled: false },
  proposalId: PROPOSAL_ID,
  rationale: 'Ten false positives a day on the patch window.',
  ruleId: RULE_ID,
};

describe('useApplyTuning', () => {
  it('posts to the builder-built apply url', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(applied);

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync(defaultParams);
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildTuningApplyUrl(PROPOSAL_ID),
      expect.objectContaining({ version: API_VERSIONS.internal.v1 })
    );
  });

  it('sends the constrained change alongside the rule id and the rationale', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(applied);

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync(defaultParams);
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildTuningApplyUrl(PROPOSAL_ID),
      expect.objectContaining({
        body: JSON.stringify({
          change: { enabled: false },
          id: RULE_ID,
          rationale: 'Ten false positives a day on the patch window.',
        }),
      })
    );
  });

  it('trims the rule id, so a pasted value with whitespace cannot 404', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(applied);

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({ ...defaultParams, ruleId: `  ${RULE_ID}\n` });
    });

    expect(services.http.post).toHaveBeenCalledWith(
      buildTuningApplyUrl(PROPOSAL_ID),
      expect.objectContaining({
        body: JSON.stringify({
          change: { enabled: false },
          id: RULE_ID,
          rationale: 'Ten false positives a day on the patch window.',
        }),
      })
    );
  });

  it('refuses a blank rationale before it reaches the server', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(
      result.current.mutateAsync({ ...defaultParams, rationale: '   ' })
    ).rejects.toThrow();
  });

  it('refuses a blank rule id rather than patching an unnamed rule', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });

    await expect(result.current.mutateAsync({ ...defaultParams, ruleId: ' ' })).rejects.toThrow();
  });

  it('never posts when the local validation refused', async () => {
    const services = createPndTestServices();

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync({ ...defaultParams, ruleId: '' }).catch(() => undefined);
    });

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('invalidates the executions projection, because the phase-4 rows change once the tuning lands', async () => {
    const services = createPndTestServices();
    services.http.post.mockResolvedValue(applied);
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync(defaultParams);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.executions.all });
  });

  it('leaves every cache alone on a 403, which says nothing about what the rule now looks like', async () => {
    const services = createPndTestServices();
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 403 }));
    const queryClient = createPndTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ queryClient, services }),
    });
    await act(async () => {
      await result.current.mutateAsync(defaultParams).catch(() => undefined);
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('posts exactly once for a 503, because a rule patch must never be retried', async () => {
    const services = createPndTestServices();
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 503 }));

    const { result } = renderHook(() => useApplyTuning(), {
      wrapper: createPndProvidersWrapper({ services }),
    });
    await act(async () => {
      await result.current.mutateAsync(defaultParams).catch(() => undefined);
    });

    expect(services.http.post).toHaveBeenCalledTimes(1);
  });
});
