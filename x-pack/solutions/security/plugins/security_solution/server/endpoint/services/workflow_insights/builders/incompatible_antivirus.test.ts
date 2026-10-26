/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import moment from 'moment';

import type { EndpointMetadataService } from '../../metadata';
import type { BuildWorkflowInsightParams } from '.';
import {
  WorkflowInsightCategory,
  WorkflowInsightSourceType,
  WorkflowInsightTargetType,
  WorkflowInsightActionType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { FILE_EVENTS_INDEX_PATTERN } from '../../../../../common/endpoint/constants';
import { MAX_NAME_LENGTH } from '../../../../../common/api/endpoint/workflow_insights/workflow_insights';
import { createMockEndpointAppContext } from '../../../mocks';
import { prefixIndexPatternsWithCcs } from '../../../utils/ccs_utils';
import { groupEndpointIdsByOS } from '../helpers';
import { buildIncompatibleAntivirusWorkflowInsights } from './incompatible_antivirus';

jest.mock('../helpers', () => {
  const actualHelpers = jest.requireActual('../helpers');
  return {
    ...actualHelpers,
    groupEndpointIdsByOS: jest.fn(),
  };
});

describe('buildIncompatibleAntivirusWorkflowInsights', () => {
  const mockEndpointAppContextService = createMockEndpointAppContext().service;
  mockEndpointAppContextService.getEndpointMetadataService = jest.fn().mockReturnValue({
    getMetadataForEndpoints: jest.fn(),
  });
  const endpointMetadataService =
    mockEndpointAppContextService.getEndpointMetadataService() as jest.Mocked<EndpointMetadataService>;

  const DEFAULT_FILE_PATH =
    '/Applications/AVGAntivirus.app/Contents/Backend/services/com.avg.activity';

  const generateParams = (
    signerId?: string,
    filePath: string = DEFAULT_FILE_PATH
  ): BuildWorkflowInsightParams => ({
    defendInsights: [
      {
        group: 'AVGAntivirus',
        events: [
          {
            id: 'lqw5opMB9Ke6SNgnxRSZ',
            endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
            value: filePath,
            ...(signerId ? { signerId } : {}),
          },
        ],
      },
    ],
    endpointMetadataService,
    esClient: {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [],
        },
      }),
    } as unknown as ElasticsearchClient,
    ccsEnabled: false,
    options: {
      insightType: 'incompatible_antivirus',
      endpointIds: ['endpoint-1'],
      connectorId: 'connector-id-1',
      model: 'model-1',
    },
  });

  const buildExpectedInsight = ({
    os,
    signerField,
    signerValue,
    expectedName = 'com.avg.activity',
    filePath = DEFAULT_FILE_PATH,
  }: {
    os: string;
    signerField?: string;
    signerValue?: string;
    expectedName?: string;
    filePath?: string;
  }) =>
    expect.objectContaining({
      '@timestamp': expect.any(moment),
      message: 'Incompatible antiviruses detected',
      category: WorkflowInsightCategory.enum.endpoint,
      type: 'incompatible_antivirus',
      source: {
        type: WorkflowInsightSourceType.enum['llm-connector'],
        id: 'connector-id-1',
        data_range_start: expect.any(moment),
        data_range_end: expect.any(moment),
      },
      target: {
        type: WorkflowInsightTargetType.enum.endpoint,
        ids: ['endpoint-1'],
      },
      action: {
        type: WorkflowInsightActionType.enum.refreshed,
        timestamp: expect.any(moment),
      },
      value: `${filePath}${signerValue ? ` ${signerValue}` : ''}`,
      remediation: {
        exception_list_items: [
          {
            list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
            name: expectedName,
            description: 'Suggested by Automatic Troubleshooting',
            entries: [
              {
                field: 'process.executable.caseless',
                operator: 'included',
                type: 'match',
                value: filePath,
              },
              ...(signerField && signerValue
                ? [
                    {
                      field: signerField,
                      operator: 'included',
                      type: 'match',
                      value: signerValue,
                    },
                  ]
                : []),
            ],
            tags: ['policy:all'],
            os_types: [os],
          },
        ],
      },
      metadata: {
        notes: {
          llm_model: 'model-1',
        },
        display_name: expectedName,
      },
    });

  it('should correctly build workflow insights', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });
    const params = generateParams();
    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([buildExpectedInsight({ os: 'windows' })]);
    expect(groupEndpointIdsByOS).toHaveBeenCalledWith(
      ['endpoint-1'],
      params.endpointMetadataService
    );
  });

  it('should correctly build workflow insights for Windows with signerId provided', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });
    const params = generateParams('test.com');

    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                Ext: {
                  code_signature: [
                    {
                      trusted: true,
                      subject_name: 'test.com',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'windows',
        signerField: 'process.Ext.code_signature',
        signerValue: 'test.com',
      }),
    ]);
    expect(groupEndpointIdsByOS).toHaveBeenCalledWith(
      ['endpoint-1'],
      params.endpointMetadataService
    );
  });

  it('should correctly build workflow insights for Windows with signerId provided as object', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });
    const params = generateParams('test.com');

    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                Ext: {
                  code_signature: {
                    trusted: true,
                    subject_name: 'test.com',
                  },
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'windows',
        signerField: 'process.Ext.code_signature',
        signerValue: 'test.com',
      }),
    ]);
    expect(groupEndpointIdsByOS).toHaveBeenCalledWith(
      ['endpoint-1'],
      params.endpointMetadataService
    );
  });

  it('should fallback to createRemediation without signer field when no valid signatures exist for Windows', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                Ext: {
                  code_signature: [{ trusted: false, subject_name: 'Untrusted Publisher' }],
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);
    expect(result).toEqual([buildExpectedInsight({ os: 'windows' })]);
  });

  it('should skip Microsoft Windows Hardware Compatibility Publisher and use the next trusted signature for Windows', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams();
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                Ext: {
                  code_signature: [
                    {
                      trusted: true,
                      subject_name: 'Microsoft Windows Hardware Compatibility Publisher',
                    },
                    { trusted: true, subject_name: 'Next Trusted Publisher' },
                  ],
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);
    expect(result).toEqual([
      buildExpectedInsight({
        os: 'windows',
        signerField: 'process.Ext.code_signature',
        signerValue: 'Next Trusted Publisher',
      }),
    ]);
  });

  it('should correctly build workflow insights for MacOS with signerId provided', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');

    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
      }),
    ]);
    expect(groupEndpointIdsByOS).toHaveBeenCalledWith(
      ['endpoint-1'],
      params.endpointMetadataService
    );
  });

  it('should fallback to createRemediation without signer field for macOS when no code_signature exists', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams();
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {},
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);
    expect(result).toEqual([buildExpectedInsight({ os: 'macos' })]);
  });

  it('should prefix file events index pattern when ccsEnabled is true', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams();
    params.ccsEnabled = true;
    const searchMock = jest.fn().mockResolvedValue({
      hits: {
        hits: [],
      },
    });
    params.esClient.search = searchMock;

    await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: prefixIndexPatternsWithCcs(FILE_EVENTS_INDEX_PATTERN, true),
      })
    );
  });

  it('should derive the trusted app name from process.name when a code-signature hit exists', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: 'AVG Activity Daemon',
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
        expectedName: 'AVG Activity Daemon',
      }),
    ]);
  });

  it('should fall back to the file path basename when no code-signature hit exists', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams();

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'macos', expectedName: 'com.avg.activity' }),
    ]);
  });

  it('should fall back to the file path basename when process.name is not a string', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: ['AVG Activity Daemon'] as unknown as string,
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
        expectedName: 'com.avg.activity',
      }),
    ]);
  });

  it('should derive the basename from windows paths with backslash and mixed separators', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const filePath = 'C:\\Program Files\\AVG/avg.exe';
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'windows', expectedName: 'avg.exe', filePath }),
    ]);
  });

  it('should derive the basename from non-windows paths with forward slash separators', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const filePath = '/opt/avg/bin/avgdaemon';
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'linux', expectedName: 'avgdaemon', filePath }),
    ]);
  });

  it('should ignore trailing separators when deriving the basename', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const filePath = 'C:\\Program Files\\AVG\\';
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'windows', expectedName: 'AVG', filePath }),
    ]);
  });

  it('should clamp the derived name to MAX_NAME_LENGTH', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const filePath = `/opt/avg/${'a'.repeat(MAX_NAME_LENGTH + 100)}`;
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'linux',
        expectedName: 'a'.repeat(MAX_NAME_LENGTH),
        filePath,
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toHaveLength(MAX_NAME_LENGTH);
    expect(result[0].metadata.display_name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('should produce no insight for an empty file path', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams(undefined, '');

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([]);
  });

  it('should produce no insight for a whitespace-only file path, for every OS group', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
      macos: ['endpoint-1'],
    });

    const params = generateParams(undefined, '   \t  ');

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    // every event in every OS group is skipped, so no group yields an insight
    expect(result).toEqual([]);
  });

  it('should resolve with no insight for a non-string file path, for every OS group', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
      macos: ['endpoint-1'],
    });

    const params = generateParams(undefined, ['/Applications/invalid'] as unknown as string);

    await expect(buildIncompatibleAntivirusWorkflowInsights(params)).resolves.toEqual([]);
  });

  it('should skip only the events with an unusable file path and keep the rest', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams();
    params.defendInsights[0].events = [
      {
        id: 'event-empty-path',
        endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
        value: '   ',
      },
      {
        id: 'lqw5opMB9Ke6SNgnxRSZ',
        endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
        value: DEFAULT_FILE_PATH,
      },
    ];

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([buildExpectedInsight({ os: 'windows' })]);
    expect(result[0].remediation.exception_list_items).toHaveLength(1);
  });

  it('should skip an event with a non-string file path and keep the remaining valid events', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const params = generateParams();
    params.defendInsights[0].events = [
      {
        id: 'event-invalid-path',
        endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
        value: ['/Applications/invalid'] as unknown as string,
      },
      {
        id: 'lqw5opMB9Ke6SNgnxRSZ',
        endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
        value: DEFAULT_FILE_PATH,
      },
    ];

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([buildExpectedInsight({ os: 'windows' })]);
  });

  it('should derive the name from a separators-only forward-slash file path on windows and non-windows', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const windowsResult = await buildIncompatibleAntivirusWorkflowInsights(
      generateParams(undefined, '/')
    );
    expect(windowsResult).toEqual([
      buildExpectedInsight({ os: 'windows', expectedName: '/', filePath: '/' }),
    ]);

    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const linuxResult = await buildIncompatibleAntivirusWorkflowInsights(
      generateParams(undefined, '/')
    );
    expect(linuxResult).toEqual([
      buildExpectedInsight({ os: 'linux', expectedName: '/', filePath: '/' }),
    ]);
  });

  it('should derive the name from a separators-only backslash file path on windows and non-windows', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });

    const windowsResult = await buildIncompatibleAntivirusWorkflowInsights(
      generateParams(undefined, '\\')
    );
    expect(windowsResult).toEqual([
      buildExpectedInsight({ os: 'windows', expectedName: '\\', filePath: '\\' }),
    ]);

    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const linuxResult = await buildIncompatibleAntivirusWorkflowInsights(
      generateParams(undefined, '\\')
    );
    expect(linuxResult).toEqual([
      buildExpectedInsight({ os: 'linux', expectedName: '\\', filePath: '\\' }),
    ]);
  });

  it('should fall through to the file path basename when process.name is an empty string', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: '',
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
        expectedName: 'com.avg.activity',
      }),
    ]);
  });

  it('should use the whole file path as the name when it has no separator', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const filePath = 'avgdaemon';
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'linux', expectedName: 'avgdaemon', filePath }),
    ]);
  });

  it('should preserve a backslash as part of the filename on non-windows file paths', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const filePath = '/opt/avg/back\\slash.exe';
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({ os: 'linux', expectedName: 'back\\slash.exe', filePath }),
    ]);
  });

  it('should derive the name from process.name when the code-signature hit has no valid signature', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: 'AVG Service',
                code_signature: {
                  trusted: false,
                  subject_name: 'Untrusted Publisher',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([buildExpectedInsight({ os: 'macos', expectedName: 'AVG Service' })]);
    expect(result[0].remediation.exception_list_items?.[0]?.entries).toEqual([
      {
        field: 'process.executable.caseless',
        operator: 'included',
        type: 'match',
        value: DEFAULT_FILE_PATH,
      },
    ]);
  });

  it('should clamp the emitted name to MAX_NAME_LENGTH UTF-16 code units when the boundary splits a two-code-unit character', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const basename = `${'a'.repeat(MAX_NAME_LENGTH - 1)}\u{1F600}`;
    const filePath = `/opt/avg/${basename}`;
    const params = generateParams(undefined, filePath);
    const expectedName = basename.slice(0, MAX_NAME_LENGTH);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'linux',
        expectedName,
        filePath,
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toHaveLength(MAX_NAME_LENGTH);
    expect(result[0].metadata.display_name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('should clamp a name made entirely of astral characters to MAX_NAME_LENGTH UTF-16 code units', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    const basename = '\u{1F600}'.repeat(200);
    const filePath = `/opt/avg/${basename}`;
    const params = generateParams(undefined, filePath);
    const expectedName = basename.slice(0, MAX_NAME_LENGTH);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'linux',
        expectedName,
        filePath,
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toHaveLength(MAX_NAME_LENGTH);
    expect(result[0].metadata.display_name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('should keep a name of exactly MAX_NAME_LENGTH code units ending in a two-code-unit character', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      linux: ['endpoint-1'],
    });

    // basename is 254 'a's + an emoji (2 UTF-16 code units) = exactly 256 code units
    const expectedName = `${'a'.repeat(MAX_NAME_LENGTH - 2)}\u{1F600}`;
    const filePath = `/opt/avg/${expectedName}`;
    const params = generateParams(undefined, filePath);

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'linux',
        expectedName,
        filePath,
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('should use a single unpaired high surrogate from process.name', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: '\uD800',
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
        expectedName: '\uD800',
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toBe('\uD800');
  });

  it('should retain trailing unpaired high surrogates from process.name', async () => {
    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      macos: ['endpoint-1'],
    });

    const params = generateParams('test.com');
    params.esClient.search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'lqw5opMB9Ke6SNgnxRSZ',
            _source: {
              process: {
                name: 'AVG Service\uD800\uD800\uD800',
                code_signature: {
                  trusted: true,
                  subject_name: 'test.com',
                },
              },
            },
          },
        ],
      },
    });

    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    const expectedName = 'AVG Service\uD800\uD800\uD800';
    expect(result).toEqual([
      buildExpectedInsight({
        os: 'macos',
        signerField: 'process.code_signature',
        signerValue: 'test.com',
        expectedName,
      }),
    ]);
    expect(result[0].remediation.exception_list_items?.[0]?.name).toBe(expectedName);
  });
});
