/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type {
  EntriesArray,
  EntryList,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Logger } from '@kbn/logging';
import {
  buildArtifact,
  getAllItemsFromEndpointExceptionList,
  getFilteredEndpointExceptionListRaw,
  convertExceptionsToEndpointFormat,
  convertYaraRulesToEndpointFormat,
} from './lists';
import type { TranslatedEntry, TranslatedExceptionListItem } from '../../schemas/artifacts';
import { ArtifactConstants } from './common';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  FILTER_PROCESS_DESCENDANTS_TAG,
  TRUSTED_PROCESS_DESCENDANTS_TAG,
  CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
  DISABLED_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts/constants';
import type { ExperimentalFeatures } from '../../../../common';
import { allowedExperimentalValues } from '../../../../common';
import {
  MetaArchValue,
  MetaScanTypeValue,
  EndpointArtifactScanContext,
} from '../../../../common/endpoint/types';
import type { YaraValidateResult } from '../libyara';
import { validateYaraRule, YaraEngineUnavailableError } from '../libyara';

jest.mock('../libyara', () => ({
  validateYaraRule: jest.fn(),
  YaraEngineUnavailableError: jest.requireActual('../libyara/errors').YaraEngineUnavailableError,
}));

const mockValidateYaraRule = validateYaraRule as jest.MockedFunction<typeof validateYaraRule>;

const createYaraValidateResult = (
  rules: Array<{ identifier?: string; arch?: string; scanType?: string }>
): YaraValidateResult => ({
  errors: [],
  warnings: [],
  errorCount: 0,
  warningCount: 0,
  rules: rules.map((rule, index) => ({
    identifier: rule.identifier ?? `rule${index}`,
    meta: {
      ...(rule.arch !== undefined ? { arch: rule.arch } : {}),
      ...(rule.scanType !== undefined ? { scan_type: rule.scanType } : {}),
    },
    duplicateMeta: [],
  })),
});

const getCustomYaraExceptionItem = (
  ruleText: string,
  overrides?: Partial<ExceptionListItemSchema>
): ExceptionListItemSchema =>
  getExceptionListItemSchemaMock({
    list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
    entries: [
      {
        field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
        operator: 'included',
        type: 'match',
        value: ruleText,
      },
    ],
    ...overrides,
  });

const MOCK_YARA_ENTRY_ID = '1';
const MOCK_YARA_ENTRY_NAME = 'some name';

describe('artifacts lists', () => {
  let mockExceptionClient: ExceptionListClient;
  let defaultFeatures: ExperimentalFeatures;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExceptionClient = listMock.getExceptionListClient();
    defaultFeatures = allowedExperimentalValues;
    mockValidateYaraRule.mockReset();
    mockValidateYaraRule.mockResolvedValue(createYaraValidateResult([{}]));
  });

  describe('getFilteredEndpointExceptionListRaw + convertExceptionsToEndpointFormat', () => {
    const TEST_FILTER = 'exception-list-agnostic.attributes.os_types:"linux"';

    test('it should get convert the exception lists response to the proper endpoint format', async () => {
      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);
      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert simple fields', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        { field: 'host.hostname', operator: 'included', type: 'match', value: 'estc' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_cased',
            value: 'windows',
          },
          {
            field: 'server.ip',
            operator: 'included',
            type: 'exact_cased',
            value: '192.168.1.1',
          },
          {
            field: 'host.hostname',
            operator: 'included',
            type: 'exact_cased',
            value: 'estc',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert fields case sensitive', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        {
          field: 'host.hostname.caseless',
          operator: 'included',
          type: 'match_any',
          value: ['estc', 'kibana'],
        },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
          },
          {
            field: 'server.ip',
            operator: 'included',
            type: 'exact_cased',
            value: '192.168.1.1',
          },
          {
            field: 'host.hostname',
            operator: 'included',
            type: 'exact_caseless_any',
            value: ['estc', 'kibana'],
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should deduplicate exception entries', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'match_any',
          value: ['estc', 'kibana'],
        },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
          },
          {
            field: 'server.ip',
            operator: 'included',
            type: 'exact_cased',
            value: '192.168.1.1',
          },
          {
            field: 'host.hostname',
            operator: 'included',
            type: 'exact_cased_any',
            value: ['estc', 'kibana'],
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should not deduplicate exception entries across nested boundaries', async () => {
      const testEntries: EntriesArray = [
        {
          entries: [
            { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
          ],
          field: 'some.parentField',
          type: 'nested',
        },
        // Same as above but not inside the nest
        { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
          {
            field: 'nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should deduplicate exception items', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
          },
          {
            field: 'server.ip',
            operator: 'included',
            type: 'exact_cased',
            value: '192.168.1.1',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;

      // Create a second exception item with the same entries
      first.data[1] = getExceptionListItemSchemaMock();
      first.data[1].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should ignore unsupported entries', async () => {
      // Lists and exists are not supported by the Endpoint
      const testEntries: EntriesArray = [
        { field: 'host.os.full', operator: 'included', type: 'match', value: 'windows' },
        {
          field: 'host.os.full',
          operator: 'included',
          type: 'list',
          list: {
            id: 'lists_not_supported',
            type: 'keyword',
          },
        } as EntryList,
        { field: 'server.ip', operator: 'included', type: 'exists' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_cased',
            value: 'windows',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert the exception lists response to the proper endpoint format while paging', async () => {
      // The first call returns two exceptions
      const first = getFoundExceptionListItemSchemaMock();
      first.per_page = 2;
      first.total = 4;
      first.data.push(getExceptionListItemSchemaMock());

      // The second call returns two exceptions
      const second = getFoundExceptionListItemSchemaMock();
      second.per_page = 2;
      second.total = 4;
      second.data.push(getExceptionListItemSchemaMock());

      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);

      // Expect 1 exceptions, the first two calls returned the same exception list items
      expect(translated.entries.length).toEqual(1);
    });

    test('it should handle no exceptions', async () => {
      const exceptionsResponse = getFoundExceptionListItemSchemaMock();
      exceptionsResponse.data = [];
      exceptionsResponse.total = 0;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionsResponse);
      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated.entries.length).toEqual(0);
    });

    test('it should convert Custom YARA Signatures to yara_rule_data entries', async () => {
      const yaraRuleText = 'rule Example { condition: true }';
      const exceptionMock = getFoundExceptionListItemSchemaMock();
      exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id;
      exceptionMock.data[0].entries = [
        {
          field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
          operator: 'included',
          type: 'match',
          value: yaraRuleText,
        },
      ];
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      });
      const translated = await convertYaraRulesToEndpointFormat(resp, 'v1');

      expect(translated).toEqual({
        entries: [
          {
            yara_rule_data: yaraRuleText,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
      expect(mockValidateYaraRule).toHaveBeenCalledWith(yaraRuleText);
    });

    test('it should convert multiple Custom YARA Signatures', async () => {
      const firstRule = 'rule First { condition: true }';
      const secondRule = 'rule Second { condition: true }';
      const exceptionMock = getFoundExceptionListItemSchemaMock(2);
      exceptionMock.data[0] = getCustomYaraExceptionItem(firstRule, {
        id: 'entry-1',
        name: 'First signature',
      });
      exceptionMock.data[1] = getCustomYaraExceptionItem(secondRule, {
        id: 'entry-2',
        name: 'Second signature',
      });
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      });
      const translated = await convertYaraRulesToEndpointFormat(resp, 'v1');

      expect(translated).toEqual({
        entries: [
          {
            yara_rule_data: firstRule,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: 'entry-1',
            entry_name: 'First signature',
          },
          {
            yara_rule_data: secondRule,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: 'entry-2',
            entry_name: 'Second signature',
          },
        ],
      });
    });

    test('it should skip Custom YARA Signatures tagged as disabled', async () => {
      const enabledRule = 'rule Enabled { condition: true }';
      const disabledRule = 'rule Disabled { condition: true }';
      const exceptionMock = getFoundExceptionListItemSchemaMock(2);
      exceptionMock.data[0] = getExceptionListItemSchemaMock({
        list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
        tags: [DISABLED_ARTIFACT_TAG],
        entries: [
          {
            field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
            operator: 'included',
            type: 'match',
            value: disabledRule,
          },
        ],
      });
      exceptionMock.data[1] = getCustomYaraExceptionItem(enabledRule);
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      });
      const translated = await convertYaraRulesToEndpointFormat(resp, 'v1');

      expect(translated).toEqual({
        entries: [
          {
            yara_rule_data: enabledRule,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
      expect(mockValidateYaraRule).toHaveBeenCalledTimes(1);
      expect(mockValidateYaraRule).toHaveBeenCalledWith(enabledRule);
    });

    test('it should skip Custom YARA Signatures without a match entry value', async () => {
      const exceptionMock = getFoundExceptionListItemSchemaMock();
      exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id;
      exceptionMock.data[0].entries = [
        {
          field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
          operator: 'included',
          type: 'exists',
        },
      ];
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

      const resp = await getFilteredEndpointExceptionListRaw({
        elClient: mockExceptionClient,
        filter: TEST_FILTER,
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      });
      const translated = await convertYaraRulesToEndpointFormat(resp, 'v1');

      expect(translated).toEqual({ entries: [] });
      expect(mockValidateYaraRule).not.toHaveBeenCalled();
    });

    test('it should convert an empty Custom YARA Signature list', async () => {
      await expect(convertYaraRulesToEndpointFormat([], 'v1')).resolves.toEqual({ entries: [] });
      expect(mockValidateYaraRule).not.toHaveBeenCalled();
    });

    test('it should throw for an unsupported Custom YARA Signature schema version', async () => {
      await expect(convertYaraRulesToEndpointFormat([], 'v2')).rejects.toThrow(
        'unsupported schemaVersion'
      );
    });

    test('it should copy meta.arch into arch_context', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([{ arch: MetaArchValue.X86 }])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule X86Only { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule X86Only { condition: true }',
            arch_context: [MetaArchValue.X86],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
    });

    test('it should split comma-separated meta.arch into arch_context', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([{ arch: `${MetaArchValue.ARM64}, ${MetaArchValue.X86}` }])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule BothArch { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule BothArch { condition: true }',
            arch_context: [MetaArchValue.ARM64, MetaArchValue.X86],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
    });

    test('it should accept matching meta.arch across rules in one entry', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([
          { identifier: 'First', arch: `${MetaArchValue.X86}, ${MetaArchValue.ARM64}` },
          { identifier: 'Second', arch: `${MetaArchValue.ARM64},${MetaArchValue.X86}` },
        ])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem(
              'rule First { condition: true } rule Second { condition: true }'
            ),
          ],
          'v1'
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule First { condition: true } rule Second { condition: true }',
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
    });

    test('it should skip an entry when meta.arch is unsupported', async () => {
      mockValidateYaraRule.mockResolvedValue(createYaraValidateResult([{ arch: 'amd64' }]));

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Amd64Only { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should skip an entry when meta.arch differs across rules', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([
          { identifier: 'First', arch: MetaArchValue.X86 },
          { identifier: 'Second', arch: MetaArchValue.ARM64 },
        ])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem(
              'rule First { condition: true } rule Second { condition: true }'
            ),
          ],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should skip an entry when some rules omit meta.arch and others set it', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([
          { identifier: 'First', arch: MetaArchValue.X86 },
          { identifier: 'Second' },
        ])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem(
              'rule First { condition: true } rule Second { condition: true }'
            ),
          ],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should skip an entry when libyara returns no compiled rules', async () => {
      mockValidateYaraRule.mockResolvedValue(createYaraValidateResult([]));

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Example { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should set scan_context to memory when meta.scan_type is omitted', async () => {
      mockValidateYaraRule.mockResolvedValue(createYaraValidateResult([{}]));

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Example { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule Example { condition: true }',
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
    });

    test('it should set scan_context to memory when meta.scan_type is Memory', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([{ scanType: MetaScanTypeValue.MEMORY }])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Example { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule Example { condition: true }',
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
    });

    test('it should skip an entry when some rules omit meta.scan_type and others set Memory', async () => {
      mockValidateYaraRule.mockResolvedValue(
        createYaraValidateResult([
          { identifier: 'First', scanType: MetaScanTypeValue.MEMORY },
          { identifier: 'Second' },
        ])
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem(
              'rule First { condition: true } rule Second { condition: true }'
            ),
          ],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should skip an entry when meta.scan_type is not Memory', async () => {
      mockValidateYaraRule.mockResolvedValue(createYaraValidateResult([{ scanType: 'File' }]));

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Example { condition: true }')],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should skip an entry when libyara reports compile errors', async () => {
      mockValidateYaraRule.mockResolvedValue({
        errors: [{ severity: 'error', message: 'syntax error', line: 1 }],
        warnings: [],
        errorCount: 1,
        warningCount: 0,
        rules: [],
      });

      await expect(
        convertYaraRulesToEndpointFormat(
          [getCustomYaraExceptionItem('rule Broken { condition: not_a_thing }')],
          'v1'
        )
      ).resolves.toEqual({ entries: [] });
    });

    test('it should retry a transient libyara engine failure for one entry and continue', async () => {
      const validRule = 'rule Valid { condition: true }';
      const logger = { warn: jest.fn(), error: jest.fn() } as unknown as Logger;
      mockValidateYaraRule
        .mockRejectedValueOnce(new YaraEngineUnavailableError('libyara WASM trap'))
        .mockResolvedValueOnce(createYaraValidateResult([{}]))
        .mockResolvedValueOnce(createYaraValidateResult([{}]));

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem('rule Flaky { condition: true }'),
            getCustomYaraExceptionItem(validRule),
          ],
          'v1',
          logger
        )
      ).resolves.toEqual({
        entries: [
          {
            yara_rule_data: 'rule Flaky { condition: true }',
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
          {
            yara_rule_data: validRule,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('libyara engine failed validating Custom YARA Signature')
      );
      expect(mockValidateYaraRule).toHaveBeenCalledTimes(3);
    });

    test('it should fail the conversion when per-item libyara retries are exhausted', async () => {
      const validRule = 'rule Valid { condition: true }';
      mockValidateYaraRule.mockRejectedValue(new YaraEngineUnavailableError('libyara WASM trap'));

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem('rule Broken { condition: true }'),
            getCustomYaraExceptionItem(validRule),
          ],
          'v1'
        )
      ).rejects.toThrow(YaraEngineUnavailableError);
      expect(mockValidateYaraRule).toHaveBeenCalledTimes(3);
    });

    test('it should fail the conversion when every libyara call throws', async () => {
      mockValidateYaraRule.mockRejectedValue(
        new YaraEngineUnavailableError('libyara WASM allocation failed')
      );

      await expect(
        convertYaraRulesToEndpointFormat(
          [
            getCustomYaraExceptionItem('rule First { condition: true }'),
            getCustomYaraExceptionItem('rule Second { condition: true }'),
          ],
          'v1'
        )
      ).rejects.toThrow(YaraEngineUnavailableError);
      expect(mockValidateYaraRule).toHaveBeenCalledTimes(3);
    });

    test('it should return a stable hash regardless of order of entries', async () => {
      const translatedEntries: TranslatedEntry[] = [
        {
          entries: [
            {
              field: 'some.nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
          ],
          field: 'some.parentField',
          type: 'nested',
        },
        {
          field: 'nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some value',
        },
      ];
      const translatedEntriesReversed = translatedEntries.reverse();

      const translatedExceptionList = {
        entries: [
          {
            type: 'simple',
            entries: translatedEntries,
          },
        ],
      };

      const translatedExceptionListReversed = {
        entries: [
          {
            type: 'simple',
            entries: translatedEntriesReversed,
          },
        ],
      };

      const artifact1 = await buildArtifact(
        translatedExceptionList,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ENDPOINT_EXCEPTIONS_NAME
      );
      const artifact2 = await buildArtifact(
        translatedExceptionListReversed,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ENDPOINT_EXCEPTIONS_NAME
      );
      expect(artifact1.decodedSha256).toEqual(artifact2.decodedSha256);
    });

    test('it should return a stable hash regardless of order of items', async () => {
      const translatedItems: TranslatedExceptionListItem[] = [
        {
          type: 'simple',
          entries: [
            {
              entries: [
                {
                  field: 'some.nested.field',
                  operator: 'included',
                  type: 'exact_cased',
                  value: 'some value',
                },
              ],
              field: 'some.parentField',
              type: 'nested',
            },
          ],
        },
        {
          type: 'simple',
          entries: [
            {
              field: 'nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
          ],
        },
      ];

      const translatedExceptionList = {
        entries: translatedItems,
      };

      const translatedExceptionListReversed = {
        entries: translatedItems.reverse(),
      };

      const artifact1 = await buildArtifact(
        translatedExceptionList,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ENDPOINT_EXCEPTIONS_NAME
      );
      const artifact2 = await buildArtifact(
        translatedExceptionListReversed,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ENDPOINT_EXCEPTIONS_NAME
      );
      expect(artifact1.decodedSha256).toEqual(artifact2.decodedSha256);
    });

    describe('`descendant_of` operator', () => {
      test.each([
        ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
        ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      ])('when %s, it should not convert `descendant_of`', async (listId) => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: 'C:\\Windows\\System32\\ping.exe',
            },
          ],
        };

        const inputEntry: EntriesArray = [
          {
            field: 'process.executable.text',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\System32\\ping.exe',
          },
        ];

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(FILTER_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = listId;
        exceptionMock.data[0].entries = inputEntry;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });

      test('it should convert `descendant_of` to the expected format', async () => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          entries: [
            {
              operator: 'included',
              type: 'descendent_of',
              value: {
                entries: [
                  {
                    type: 'simple',
                    entries: [
                      {
                        field: 'process.executable',
                        operator: 'included',
                        type: 'exact_caseless',
                        value: 'C:\\Windows\\System32\\ping.exe',
                      },
                      {
                        field: 'event.category',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'process',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        };

        const inputEntry: EntriesArray = [
          {
            field: 'process.executable.text',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\System32\\ping.exe',
          },
        ];

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(FILTER_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.eventFilters.id;
        exceptionMock.data[0].entries = inputEntry;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });

      test('it should handle nested entries properly', async () => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          entries: [
            {
              operator: 'included',
              type: 'descendent_of',
              value: {
                entries: [
                  {
                    type: 'simple',
                    entries: [
                      {
                        entries: [
                          {
                            field: 'nested.field',
                            operator: 'included',
                            type: 'exact_cased',
                            value: 'some value',
                          },
                        ],
                        field: 'some.parentField',
                        type: 'nested',
                      },
                      {
                        field: 'some.not.nested.field',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'some value',
                      },
                      {
                        field: 'event.category',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'process',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        };

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(FILTER_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.eventFilters.id;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });
    });

    describe(`'trusted_descendants' operator`, () => {
      let enabledTrustedProcessDescendant: ExperimentalFeatures;

      beforeEach(() => {
        enabledTrustedProcessDescendant = {
          ...defaultFeatures,
          filterProcessDescendantsForTrustedAppsEnabled: true,
        };
      });
      it('when the feature flag is disabled, it should not convert `trusted_descendants`', async () => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: 'C:\\Windows\\System32\\ping.exe',
            },
          ],
        };

        const inputEntry: EntriesArray = [
          {
            field: 'process.executable.text',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\System32\\ping.exe',
          },
        ];

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
        exceptionMock.data[0].entries = inputEntry;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(resp, 'v1', {
          filterProcessDescendantsForTrustedAppsEnabled: false,
        } as ExperimentalFeatures);

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });

      it.each([
        ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
        ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      ])('when %s, it should not convert process descendants for trusted apps', async (listId) => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: 'C:\\Windows\\System32\\ping.exe',
            },
          ],
        };

        const inputEntry: EntriesArray = [
          {
            field: 'process.executable.text',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\System32\\ping.exe',
          },
        ];

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = listId;
        exceptionMock.data[0].entries = inputEntry;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(
          resp,
          'v1',
          enabledTrustedProcessDescendant
        );

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });

      it('it should convert `trusted_descendants` to the expected format', async () => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          trust_descendants: true,
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: 'C:\\Windows\\System32\\ping.exe',
            },
            {
              field: 'event.category',
              operator: 'included',
              type: 'exact_cased',
              value: 'process',
            },
          ],
        } as TranslatedExceptionListItem;

        const inputEntry: EntriesArray = [
          {
            field: 'process.executable.text',
            operator: 'included',
            type: 'match',
            value: 'C:\\Windows\\System32\\ping.exe',
          },
        ];

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
        exceptionMock.data[0].entries = inputEntry;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(
          resp,
          'v1',
          enabledTrustedProcessDescendant
        );

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });

      it('should handle nested entries properly', async () => {
        const expectedEndpointExceptions: TranslatedExceptionListItem = {
          type: 'simple',
          trust_descendants: true,
          entries: [
            {
              entries: [
                {
                  field: 'nested.field',
                  operator: 'included',
                  type: 'exact_cased',
                  value: 'some value',
                },
              ],
              field: 'some.parentField',
              type: 'nested',
            },
            {
              field: 'some.not.nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
            {
              field: 'event.category',
              operator: 'included',
              type: 'exact_cased',
              value: 'process',
            },
          ],
        };

        const exceptionMock = getFoundExceptionListItemSchemaMock();
        exceptionMock.data[0].tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);
        exceptionMock.data[0].list_id = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionMock);

        const resp = await getFilteredEndpointExceptionListRaw({
          elClient: mockExceptionClient,
          filter: TEST_FILTER,
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        });
        const translated = convertExceptionsToEndpointFormat(
          resp,
          'v1',
          enabledTrustedProcessDescendant
        );

        expect(translated).toEqual({ entries: [expectedEndpointExceptions] });
      });
    });
  });

  describe('Endpoint Artifacts', () => {
    const getOsFilter = (os: 'macos' | 'linux' | 'windows') =>
      `exception-list-agnostic.attributes.os_types:"${os} "`;

    describe.each`
      os           | value                    | exceptionOperatorType
      ${'linux'}   | ${'/usr/bi*/doc.md'}     | ${'wildcard_cased'}
      ${'macos'}   | ${'C:\\My Doc*\\doc.md'} | ${'wildcard_caseless'}
      ${'windows'} | ${'/usr/bi*/doc.md'}     | ${'wildcard_caseless'}
    `(
      '$os',
      ({
        os,
        value,
        exceptionOperatorType,
      }: {
        os: 'linux' | 'macos' | 'windows';
        value: string;
        exceptionOperatorType: string;
      }) => {
        test('it should translate wildcard process.executable entry without modifications', async () => {
          const testEntries: EntriesArray = [
            {
              field: 'process.executable.caseless',
              operator: 'included',
              type: 'wildcard',
              value,
            },
          ];

          const expectedEndpointExceptions = {
            type: 'simple',
            entries: [
              {
                field: 'process.executable',
                operator: 'included',
                type: exceptionOperatorType,
                value,
              },
            ],
          };

          const first = getFoundExceptionListItemSchemaMock();
          first.data[0].entries = testEntries;
          first.data[0].os_types = [os];
          mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

          const resp = await getFilteredEndpointExceptionListRaw({
            elClient: mockExceptionClient,
            filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
            listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          });
          const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
          expect(translated).toEqual({
            entries: [expectedEndpointExceptions],
          });
        });

        test('it should translate wildcard file.path.text entry without modifications', async () => {
          const testEntries: EntriesArray = [
            {
              field: 'file.path.text',
              operator: 'included',
              type: 'wildcard',
              value,
            },
          ];

          const expectedEndpointExceptions = {
            type: 'simple',
            entries: [
              {
                field: 'file.path',
                operator: 'included',
                type: exceptionOperatorType,
                value,
              },
            ],
          };

          const first = getFoundExceptionListItemSchemaMock();
          first.data[0].entries = testEntries;
          first.data[0].os_types = [os];
          mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

          const resp = await getFilteredEndpointExceptionListRaw({
            elClient: mockExceptionClient,
            filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
            listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          });
          const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
          expect(translated).toEqual({
            entries: [expectedEndpointExceptions],
          });
        });
      }
    );
  });

  const TEST_EXCEPTION_LIST_ITEM = {
    entries: [
      {
        type: 'simple',
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
      },
    ],
  };

  describe('Builds proper kuery', () => {
    test('for Endpoint List', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'windows',
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      });

      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"windows"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Trusted Apps', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'macos',
        listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      });
      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);

      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"macos"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Event Filters', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'macos',
        listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      });

      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"macos"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Host Isolation Exceptions', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'macos',
        listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
      });

      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"macos"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Blocklists', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'macos',
        listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      });

      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"macos"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Trusted Devices', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'windows',
        listId: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
      });

      const translated = convertExceptionsToEndpointFormat(resp, 'v1', defaultFeatures);
      expect(translated).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"windows"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Custom YARA Signatures', async () => {
      const yaraRuleText = 'rule Example { condition: true }';
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce({
        ...getFoundExceptionListItemSchemaMock(),
        data: [
          getExceptionListItemSchemaMock({
            list_id: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
            entries: [
              {
                field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
                operator: 'included',
                type: 'match',
                value: yaraRuleText,
              },
            ],
          }),
        ],
      });

      const resp = await getAllItemsFromEndpointExceptionList({
        elClient: mockExceptionClient,
        os: 'linux',
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      });
      const translated = await convertYaraRulesToEndpointFormat(resp, 'v1');

      expect(translated).toEqual({
        entries: [
          {
            yara_rule_data: yaraRuleText,
            arch_context: [MetaArchValue.X86, MetaArchValue.ARM64],
            scan_context: [EndpointArtifactScanContext.MEMORY],
            entry_id: MOCK_YARA_ENTRY_ID,
            entry_name: MOCK_YARA_ENTRY_NAME,
          },
        ],
      });

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"linux"',
        perPage: 1000,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });
  });
});
