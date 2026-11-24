/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContextService } from '../../../mocks';
import type { ExportProvider } from '../../../../../common/endpoint/types';
import { createAzureBlobServiceSas } from './azure_blob_sas';
import { createExportCredentials } from './create_export_credentials';

// Not a real key
const ACCOUNT_KEY =
  'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==';
const PACKAGE_POLICY_ID = 'package-policy-1';
const EXPORT_PATH = '6f2b0c1e-6a43-4c55-9d0a-2f1b7c3e9a10/upload.zip';

describe('createExportCredentials()', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let getAccountKeyMock: jest.Mock;
  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;

  const provider: ExportProvider = {
    id: 'azure-1',
    type: 'azure_blob',
    account_name: 'exportsacct',
    container: 'exports',
    service_url: 'https://exportsacct.blob.core.windows.net',
  };

  const callService = () =>
    createExportCredentials({
      endpointService: endpointServiceMock,
      packagePolicyId: PACKAGE_POLICY_ID,
      provider,
      exportPath: EXPORT_PATH,
      actionExpiration: '2026-12-08T12:00:00.789Z',
    });

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    getAccountKeyMock = endpointServiceMock.getExportProviderKeyService()
      .getAccountKey as jest.Mock;
    loggerMock = loggingSystemMock.createLogger();
    (endpointServiceMock.createLogger as jest.Mock).mockReturnValue(loggerMock);
  });

  it('reads the account key once for the package policy and provider', async () => {
    getAccountKeyMock.mockResolvedValue(ACCOUNT_KEY);
    await callService();

    expect(getAccountKeyMock).toHaveBeenCalledTimes(1);
    expect(getAccountKeyMock).toHaveBeenCalledWith(PACKAGE_POLICY_ID, provider);
  });

  it('returns `undefined` when there is no account key', async () => {
    getAccountKeyMock.mockResolvedValue(undefined);

    await expect(callService()).resolves.toBeUndefined();
  });

  it('expires 24 hours after the action, truncated to the second', async () => {
    getAccountKeyMock.mockResolvedValue(ACCOUNT_KEY);

    await expect(callService()).resolves.toEqual(
      expect.objectContaining({ expiresAt: '2026-12-09T12:00:00.000Z' })
    );
  });

  it('signs a blob SAS for the provider container and the export path', async () => {
    getAccountKeyMock.mockResolvedValue(ACCOUNT_KEY);
    const credentials = await callService();
    const sas = credentials?.sas ?? '';
    const params = new URLSearchParams(sas);

    expect(sas).toBe(
      createAzureBlobServiceSas({
        accountName: provider.account_name,
        accountKey: ACCOUNT_KEY,
        container: provider.container,
        blobPath: EXPORT_PATH,
        expiresOn: new Date(credentials?.expiresAt ?? ''),
      })
    );
    expect(params.get('sr')).toBe('b');
    expect(params.get('sp')).toBe('rcw');
    expect(params.get('spr')).toBe('https');
    expect(params.get('sv')).toBe('2022-11-02');
  });

  it('never logs the account key or the SAS', async () => {
    getAccountKeyMock.mockResolvedValue(ACCOUNT_KEY);
    const credentials = await callService();
    const logged = JSON.stringify(loggingSystemMock.collect(loggerMock));

    expect(logged).toContain(EXPORT_PATH);
    expect(logged).not.toContain(ACCOUNT_KEY);
    expect(logged).not.toContain(credentials?.sas);
    expect(logged).not.toContain(new URLSearchParams(credentials?.sas).get('sig'));
  });
});
