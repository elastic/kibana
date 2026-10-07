/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { CHECK_ENDPOINT_PACKAGE_FRESHNESS_TOOL_ID } from '../..';
import { checkEndpointPackageFreshnessTool } from '.';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = { logger: mockLogger } as unknown as ToolHandlerContext;

describe('checkEndpointPackageFreshnessTool', () => {
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockPackageClient: jest.Mocked<PackageClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointAppContextService = createMockEndpointAppContext().service;
    mockPackageClient = mockEndpointAppContextService.getInternalFleetServices()
      .packages as jest.Mocked<PackageClient>;
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = checkEndpointPackageFreshnessTool(mockEndpointAppContextService);
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(CHECK_ENDPOINT_PACKAGE_FRESHNESS_TOOL_ID);
      expect(tool.description).toContain('stale');
    });

    it('has correct tool id format', () => {
      expect(CHECK_ENDPOINT_PACKAGE_FRESHNESS_TOOL_ID).toBe(
        'automatic_troubleshooting.check_endpoint_package_freshness'
      );
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof checkEndpointPackageFreshnessTool>;

    beforeEach(() => {
      tool = checkEndpointPackageFreshnessTool(mockEndpointAppContextService);
    });

    it('returns stale: false when installed version equals latest', async () => {
      mockPackageClient.getInstallation.mockResolvedValue({ version: '9.4.0' } as Awaited<
        ReturnType<typeof mockPackageClient.getInstallation>
      >);
      mockPackageClient.getLatestPackageInfo.mockResolvedValue({ version: '9.4.0' } as Awaited<
        ReturnType<typeof mockPackageClient.getLatestPackageInfo>
      >);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toMatchObject({
          installedVersion: '9.4.0',
          latestVersion: '9.4.0',
          stale: false,
        });
      }
    });

    it('returns stale: true when installed version is behind latest', async () => {
      mockPackageClient.getInstallation.mockResolvedValue({ version: '9.3.0' } as Awaited<
        ReturnType<typeof mockPackageClient.getInstallation>
      >);
      mockPackageClient.getLatestPackageInfo.mockResolvedValue({ version: '9.4.0' } as Awaited<
        ReturnType<typeof mockPackageClient.getLatestPackageInfo>
      >);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].data).toMatchObject({
          installedVersion: '9.3.0',
          latestVersion: '9.4.0',
          stale: true,
        });
      }
    });

    it('returns stale: false when package is not installed', async () => {
      mockPackageClient.getInstallation.mockResolvedValue(undefined);
      mockPackageClient.getLatestPackageInfo.mockResolvedValue({ version: '9.4.0' } as Awaited<
        ReturnType<typeof mockPackageClient.getLatestPackageInfo>
      >);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].data).toMatchObject({
          installedVersion: null,
          latestVersion: '9.4.0',
          stale: false,
        });
      }
    });

    it('returns an error result when Fleet call throws', async () => {
      mockPackageClient.getInstallation.mockRejectedValue(new Error('registry unavailable'));

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.error);
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns stale: false when version strings are invalid semver', async () => {
      mockPackageClient.getInstallation.mockResolvedValue({ version: 'not-semver' } as Awaited<
        ReturnType<typeof mockPackageClient.getInstallation>
      >);
      mockPackageClient.getLatestPackageInfo.mockResolvedValue({
        version: 'also-not-semver',
      } as Awaited<ReturnType<typeof mockPackageClient.getLatestPackageInfo>>);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].data).toMatchObject({ stale: false });
      }
    });
  });
});
