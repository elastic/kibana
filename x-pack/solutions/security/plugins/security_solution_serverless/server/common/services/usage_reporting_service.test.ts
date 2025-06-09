/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import https from 'https';
import { merge } from 'lodash';

import { KBN_CERT_PATH, KBN_KEY_PATH, CA_CERT_PATH } from '@kbn/dev-utils';

import type { UsageApiConfigSchema } from '../../config';
import type { UsageRecord } from '../../types';

import { UsageReportingService } from './usage_reporting_service';
import { USAGE_REPORTING_ENDPOINT, USAGE_SERVICE_USAGE_URL } from '../../constants';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('UsageReportingService', () => {
  let usageApiConfig: UsageApiConfigSchema;
  let service: UsageReportingService;

  function generateUsageApiConfig(overrides?: Partial<UsageApiConfigSchema>): UsageApiConfigSchema {
    const DEFAULT_USAGE_API_CONFIG = { enabled: false };
    usageApiConfig = merge(DEFAULT_USAGE_API_CONFIG, overrides);

    return usageApiConfig;
  }

  function setupService(
    usageApi: UsageApiConfigSchema = generateUsageApiConfig()
  ): UsageReportingService {
    service = new UsageReportingService(usageApi);
    return service;
  }

  function generateUsageRecord(overrides?: Partial<UsageRecord>): UsageRecord {
    const date = new Date().toISOString();
    const DEFAULT_USAGE_RECORD = {
      id: `usage-record-id-${date}`,
      usage_timestamp: date,
      creation_timestamp: date,
      usage: {},
      source: {},
    } as UsageRecord;
    return merge(DEFAULT_USAGE_RECORD, overrides);
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('usageApi configs not provided', () => {
    beforeEach(() => {
      setupService();
    });

    it('should still work if usageApi.url is not provided', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(USAGE_SERVICE_USAGE_URL, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.any(https.Agent),
      });
      expect(response).toBe(mockResponse);
    });

    it('should use an agent with rejectUnauthorized false if config.enabled is false', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(USAGE_SERVICE_USAGE_URL, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.objectContaining({
          options: expect.objectContaining({ rejectUnauthorized: false }),
        }),
      });
      expect(response).toBe(mockResponse);
    });

    it('should not set agent if the URL is not https', async () => {
      const url = 'http://usage-api.example';
      setupService(generateUsageApiConfig({ url }));
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${url}${USAGE_REPORTING_ENDPOINT}`, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response).toBe(mockResponse);
    });
  });

  describe('usageApi configs provided', () => {
    const DEFAULT_CONFIG = {
      enabled: true,
      url: 'https://usage-api.example',
      tls: {
        certificate: KBN_CERT_PATH,
        key: KBN_KEY_PATH,
        ca: CA_CERT_PATH,
      },
    };

    beforeEach(() => {
      setupService(generateUsageApiConfig(DEFAULT_CONFIG));
    });

    it('should use usageApi.url if provided', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);
      const url = `${DEFAULT_CONFIG.url}${USAGE_REPORTING_ENDPOINT}`;

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.any(https.Agent),
      });
      expect(response).toBe(mockResponse);
    });

    it('should use an agent with TLS configuration if config.enabled is true', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);
      const url = `${DEFAULT_CONFIG.url}${USAGE_REPORTING_ENDPOINT}`;

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.objectContaining({
          options: expect.objectContaining({
            cert: expect.any(String),
            key: expect.any(String),
            ca: expect.arrayContaining([expect.any(String)]),
          }),
        }),
      });
      expect(response).toBe(mockResponse);
    });
  });
});
