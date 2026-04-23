/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import { merge } from 'lodash';

import { KBN_CERT_PATH, KBN_KEY_PATH, CA_CERT_PATH } from '@kbn/dev-utils';

import type { UsageApiConfigSchema } from '../../config';
import type { UsageRecord } from '../../types';

import { UsageReportingService } from './usage_reporting_service';

const mockedFetch = jest.spyOn(global, 'fetch');

describe('UsageReportingService', () => {
  let usageApiConfig: UsageApiConfigSchema;
  let service: UsageReportingService;

  const kibanaVersion = '8.16.0';

  function generateUsageApiConfig(overrides?: Partial<UsageApiConfigSchema>): UsageApiConfigSchema {
    const DEFAULT_USAGE_API_CONFIG = { enabled: false };
    usageApiConfig = merge(DEFAULT_USAGE_API_CONFIG, overrides);

    return usageApiConfig;
  }

  function setupService(
    usageApi: UsageApiConfigSchema = generateUsageApiConfig()
  ): UsageReportingService {
    service = new UsageReportingService(usageApi, kibanaVersion);
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

    it('should not set agent if the URL is not https', async () => {
      const url = 'http://usage-api.example';
      setupService(generateUsageApiConfig({ url }));
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      mockedFetch.mockResolvedValue(mockResponse);

      const response = await service.reportUsage(records);

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Kibana/${kibanaVersion} node-fetch`,
        },
      });
      expect(response).toBe(mockResponse);
    });

    it('should throw if url not provided', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      await expect(service.reportUsage(records)).rejects.toThrowError('usage-api url not provided');
    });

    it('should throw if TLS configs not provided', async () => {
      const url = 'https://some-url';
      setupService(generateUsageApiConfig({ url }));
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      await expect(service.reportUsage(records)).rejects.toThrowError(
        'usage-api TLS configs not provided'
      );
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

    it('should correctly use usageApi.url', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      mockedFetch.mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);
      const url = DEFAULT_CONFIG.url;

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Kibana/${kibanaVersion} node-fetch`,
        },
        dispatcher: expect.any(Agent),
      });
      expect(response).toBe(mockResponse);
    });

    it('should use an agent with TLS configuration if config.enabled is true', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      mockedFetch.mockResolvedValueOnce(mockResponse);

      const response = await service.reportUsage(records);
      const url = DEFAULT_CONFIG.url;

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Kibana/${kibanaVersion} node-fetch`,
        },
        dispatcher: expect.any(Agent),
      });
      expect(response).toBe(mockResponse);
    });
  });
});
