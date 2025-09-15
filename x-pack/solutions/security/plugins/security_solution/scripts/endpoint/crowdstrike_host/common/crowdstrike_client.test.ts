/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { CrowdStrikeClient } from './crowdstrike_client';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CrowdStrikeClient', () => {
  let client: CrowdStrikeClient;
  const mockLog = createToolingLogger();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful token response for constructor
    const mockTokenResponse = {
      data: {
        access_token: 'test-token',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    };
    mockedAxios.post.mockResolvedValue(mockTokenResponse);

    client = new CrowdStrikeClient({
      url: 'https://api.crowdstrike.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      log: mockLog,
    });
  });

  describe('constructor', () => {
    it('should initialize with correct options', () => {
      expect(client).toBeDefined();
    });

    it('should use provided logger', () => {
      const customLog = createToolingLogger();
      const clientWithLog = new CrowdStrikeClient({
        url: 'https://api.crowdstrike.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        log: customLog,
      });

      expect(clientWithLog).toBeDefined();
    });
  });

  describe('buildUrl', () => {
    it('should build correct URL with path', () => {
      const url = client.buildUrl('/test/path');
      expect(url).toBe('https://api.crowdstrike.com/test/path');
    });
  });

  describe('getSensorInstallers', () => {
    it('should get sensor installers for specified platform', async () => {
      const mockResponse = {
        resources: [
          {
            sha256: 'abc123',
            name: 'falcon-sensor-ubuntu.deb',
            platform: 'ubuntu',
            version: '6.45.0',
            description: 'Falcon sensor for Ubuntu',
            fileType: 'deb',
            releaseDate: '2023-01-01',
          },
        ],
      };

      (axios.request as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await client.getSensorInstallers('ubuntu');
      expect(result).toEqual(mockResponse.resources);
    });
  });

  describe('authentication', () => {
    it('should authenticate and get token', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);

      // Access the setup promise to trigger authentication
      const setup = await (client as unknown as { setup: Promise<{ accessToken: string }> }).setup;

      expect(setup.accessToken).toBe('test-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.crowdstrike.com/oauth2/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
    });
  });
});
