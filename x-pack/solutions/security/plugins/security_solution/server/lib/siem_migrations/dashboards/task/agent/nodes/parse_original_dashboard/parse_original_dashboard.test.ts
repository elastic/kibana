/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParseOriginalDashboardNode } from './parse_original_dashboard';
import type { MigrateDashboardGraphParams, MigrateDashboardState } from '../../types';
import { SplunkXmlDashboardParser } from '../../../../../../../../common/siem_migrations/parsers/splunk/dashboard_xml';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';

// Mock the SplunkXmlDashboardParser
jest.mock('../../../../../../../../common/siem_migrations/parsers/splunk/dashboard_xml');

const mockSplunkXmlDashboardParser = SplunkXmlDashboardParser;

const getTestNode = () =>
  getParseOriginalDashboardNode({
    experimentalFeatures: {
      splunkV2DashboardsEnabled: false,
    },
  } as unknown as MigrateDashboardGraphParams);

describe('getParseOriginalDashboardNode', () => {
  const mockState = {
    id: 'test-id',
    original_dashboard: {
      id: 'dashboard-1',
      vendor: 'splunk',
      title: 'Test Dashboard',
      description: 'Test description',
      data: '<dashboard version="1.1"><row><panel><title>Test Panel</title><query>test query</query></panel></row></dashboard>',
      format: 'xml',
    },
    resources: {},
  } as MigrateDashboardState;

  const mockConfig = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully parse a supported Splunk XML dashboard', async () => {
    const mockPanels = [
      {
        id: 'panel-1',
        title: 'Test Panel',
        query: 'test query',
        viz_type: 'table',
        position: { x: 0, y: 0, w: 24, h: 16 },
      },
    ];

    // Mock the static method
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: true,
    });

    // Mock the instance methods
    const mockParserInstance = {
      extractPanels: jest.fn().mockResolvedValue(mockPanels),
      xml: mockState.original_dashboard.data,
      parse: jest.fn(),
      extractQueries: jest.fn(),
      getPanelChartType: jest.fn(),
      getPanelPosition: jest.fn(),
      getPanelTitle: jest.fn(),
      getPanelQuery: jest.fn(),
      getVersion: jest.fn().mockResolvedValue('1.1'),
    };
    jest
      .mocked(mockSplunkXmlDashboardParser)
      .mockImplementation(() => mockParserInstance as unknown as SplunkXmlDashboardParser);

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(mockSplunkXmlDashboardParser).toHaveBeenCalledWith(mockState.original_dashboard.data);
    expect(mockParserInstance.extractPanels).toHaveBeenCalled();

    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: mockPanels,
      },
    });
  });

  it('should throw error for unsupported dashboard vendor', async () => {
    const unsupportedState = {
      ...mockState,
      original_dashboard: {
        ...mockState.original_dashboard,
        vendor: 'other',
      },
    };

    const node = getTestNode();

    await expect(node(unsupportedState as MigrateDashboardState, mockConfig)).rejects.toThrow(
      'Unsupported dashboard vendor'
    );
  });

  it('should return untranslatable result for unsupported Splunk XML - wrong root tag', async () => {
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: false,
      reason: 'Unsupported root tag: form',
    });

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: [],
      },
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      comments: [
        {
          message: 'Unsupported Splunk XML: Unsupported root tag: form',
          created_by: 'assistant',
          created_at: expect.any(String),
        },
      ],
    });
  });

  it('should return untranslatable result for unsupported Splunk XML - wrong version', async () => {
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: false,
      reason: 'Unsupported version. Only version 1.1 is supported.',
    });

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: [],
      },
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      comments: [
        {
          message: 'Unsupported Splunk XML: Unsupported version. Only version 1.1 is supported.',
          created_by: 'assistant',
          created_at: expect.any(String),
        },
      ],
    });
  });

  it('should return untranslatable result for unsupported Splunk XML - no rows', async () => {
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: false,
      reason: 'No <row> elements found in the provided Dashboard XML.',
    });

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: [],
      },
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      comments: [
        {
          message: 'Unsupported Splunk XML: No <row> elements found in the provided Dashboard XML.',
          created_by: 'assistant',
          created_at: expect.any(String),
        },
      ],
    });
  });

  it('should handle parser errors gracefully', async () => {
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: true,
    });

    const mockParserInstance = {
      getVersion: jest.fn().mockResolvedValue('1.1'),
      extractPanels: jest.fn().mockRejectedValue(new Error('Parser error')),
    };
    jest
      .mocked(mockSplunkXmlDashboardParser)
      .mockImplementation(() => mockParserInstance as unknown as SplunkXmlDashboardParser);

    const node = getTestNode();

    await expect(node(mockState, mockConfig)).rejects.toThrow('Parser error');
    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
  });

  it('should return empty panels array when parser returns no panels', async () => {
    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: true,
    });

    const mockParserInstance = {
      getVersion: jest.fn().mockResolvedValue('1.1'),
      extractPanels: jest.fn().mockResolvedValue([]),
    };
    jest
      .mocked(mockSplunkXmlDashboardParser)
      .mockImplementation(() => mockParserInstance as unknown as SplunkXmlDashboardParser);

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: [],
      },
    });
  });

  it('should handle multiple panels correctly', async () => {
    const mockPanels = [
      {
        id: 'panel-1',
        title: 'Panel 1',
        query: 'query 1',
        viz_type: 'table',
        position: { x: 0, y: 0, w: 12, h: 16 },
      },
      {
        id: 'panel-2',
        title: 'Panel 2',
        query: 'query 2',
        viz_type: 'pie',
        position: { x: 12, y: 0, w: 12, h: 16 },
      },
    ];

    mockSplunkXmlDashboardParser.isSupportedSplunkXml = jest.fn().mockReturnValue({
      isSupported: true,
    });

    const mockParserInstance = {
      getVersion: jest.fn().mockResolvedValue('1.1'),
      extractPanels: jest.fn().mockResolvedValue(mockPanels),
    };
    jest
      .mocked(mockSplunkXmlDashboardParser)
      .mockImplementation(() => mockParserInstance as unknown as SplunkXmlDashboardParser);

    const node = getTestNode();
    const result = await node(mockState, mockConfig);

    expect(mockSplunkXmlDashboardParser.isSupportedSplunkXml).toHaveBeenCalledWith(
      mockState.original_dashboard.data
    );
    expect(result).toEqual({
      parsed_original_dashboard: {
        title: 'Test Dashboard',
        panels: mockPanels,
      },
    });
  });
});
