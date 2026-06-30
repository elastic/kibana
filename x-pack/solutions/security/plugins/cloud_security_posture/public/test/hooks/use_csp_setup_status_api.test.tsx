/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { CspStatusCode } from '@kbn/cloud-security-posture-common';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';

import {
  indexTimeoutHandler,
  indexedHandler,
  indexingHandler,
  notDeployedHandler,
  notInstalledHandler,
  notInstalledHasMisconfigurationsFindingsHandler,
  unprivilegedHandler,
} from '../../../server/routes/status/status.handlers.mock';
import { setupMockServer, startMockServer } from '../mock_server/mock_server';
import { MockServerTestProvider } from '../mock_server/mock_server_test_provider';

const server = setupMockServer();

describe('useCspSetupStatusApi', () => {
  startMockServer(server);

  it.each<[CspStatusCode | 'not-installed-has-findings', Parameters<typeof server.use>[0]]>([
    ['indexed', indexedHandler],
    ['indexing', indexingHandler],
    ['not-installed', notInstalledHandler],
    ['not-deployed', notDeployedHandler],
    ['unprivileged', unprivilegedHandler],
    ['index-timeout', indexTimeoutHandler],
    ['not-installed-has-findings', notInstalledHasMisconfigurationsFindingsHandler],
  ])('returns %s for the matching status response', async (expected, handler) => {
    server.use(handler);

    const { result } = renderHook(() => useCspSetupStatusApi(), {
      wrapper: MockServerTestProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    if (expected === 'not-installed-has-findings') {
      expect(result.current.data?.cspm.status).toBe('not-installed');
      expect(result.current.data?.kspm.status).toBe('not-installed');
      expect(result.current.data?.vuln_mgmt.status).toBe('not-installed');
      expect(result.current.data?.hasMisconfigurationsFindings).toBe(true);
      return;
    }

    expect(result.current.data?.cspm.status).toBe(expected);
    expect(result.current.data?.kspm.status).toBe(expected);
    expect(result.current.data?.vuln_mgmt.status).toBe(expected);
  });

  it('exposes indicesDetails verbatim from the response so consumers can render unprivileged indices', async () => {
    server.use(unprivilegedHandler);

    const { result } = renderHook(() => useCspSetupStatusApi(), {
      wrapper: MockServerTestProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.indicesDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: 'security_solution-cloud_security_posture.misconfiguration_latest',
          status: 'unprivileged',
        }),
        expect.objectContaining({
          index: 'logs-cloud_security_posture.findings-default*',
          status: 'unprivileged',
        }),
        expect.objectContaining({
          index: 'logs-cloud_security_posture.scores-default',
          status: 'unprivileged',
        }),
        expect.objectContaining({
          index: 'logs-cloud_security_posture.vulnerabilities_latest-default',
          status: 'unprivileged',
        }),
      ])
    );
  });
});
