/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';

import {
  getFormattedComments,
  formatOperatingSystems,
  formatExceptionItemForUpdate,
  enrichNewExceptionItemsWithComments,
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  prepareExceptionItemsForBulkClose,
  lowercaseHashValues,
  getPrepopulatedEndpointException,
  defaultEndpointExceptionItems,
  getFileCodeSignature,
  getProcessCodeSignature,
  retrieveAlertOsTypes,
  getCodeSignatureValue,
  buildRuleExceptionWithConditions,
  buildExceptionEntriesFromAlertFields,
  filterHighlightedFields,
  getPrepopulatedRuleExceptionWithHighlightFields,
  getAlertHighlightedFields,
} from './helpers';
import * as mockHelpers from './helpers';
import type { AlertData, Flattened } from './types';
import type {
  EntriesArray,
  OsTypeArray,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum, ListOperatorEnum } from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '@kbn/lists-plugin/common/schemas/types/entry_match.mock';
import { getCommentsArrayMock } from '@kbn/lists-plugin/common/schemas/types/comment.mock';
import { ENTRIES, OLD_DATE_RELATIVE_TO_DATE_NOW } from '@kbn/lists-plugin/common/constants.mock';
import type { CodeSignature } from '@kbn/securitysolution-ecs';
import {
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
} from '../../../../common/field_maps/field_names';
import { AGENT_ID } from './highlighted_fields_config';
import { SUPPORTED_AGENT_ID_ALERT_FIELDS } from '../../../../common/endpoint/service/response_actions/constants';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

describe('Exception helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#formatOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = formatOperatingSystems(['some os', 'some other os']);
      expect(result).toEqual('');
    });

    test('it returns formatted operating systems if multiple specified', () => {
      const result = formatOperatingSystems(['some tag', 'macos', 'some other tag', 'windows']);
      expect(result).toEqual('macOS, Windows');
    });
  });

  describe('#getFormattedComments', () => {
    test('it returns formatted comment object with username and timestamp', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      expect(result[0].username).toEqual('some user');
      expect(result[0].timestamp).toEqual('on Apr 20th 2020 @ 15:25:31');
    });

    test('it returns formatted timeline icon with comment users initial', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].timelineAvatar as React.ReactElement);

      expect(wrapper.text()).toEqual('SU');
    });

    test('it returns comment text', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].children as React.ReactElement);

      expect(wrapper.text()).toEqual('some old comment');
    });
  });

  describe('#formatExceptionItemForUpdate', () => {
    test('it should return correct update fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const result = formatExceptionItemForUpdate(payload);
      const expected = {
        comments: [],
        description: 'some description',
        entries: ENTRIES,
        id: '1',
        item_id: 'endpoint_list_item',
        meta: {},
        name: 'some name',
        namespace_type: 'single',
        os_types: [],
        tags: ['user added string for a tag', 'malware'],
        type: 'simple',
      };
      expect(result).toEqual(expected);
    });
  });
  describe('#enrichExistingExceptionItemWithComments', () => {
    test('it should return exception item with comments stripped of "created_by", "created_at", "updated_by", "updated_at" fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const comments = [
        {
          comment: 'Im an existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '1',
        },
        {
          comment: 'Im another existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '2',
        },
        {
          comment: 'Im a new comment',
        },
      ];
      const result = enrichExistingExceptionItemWithComments(payload, comments);
      const expected = {
        ...getExceptionListItemSchemaMock(),
        comments: [
          {
            comment: 'Im an existing comment',
            id: '1',
          },
          {
            comment: 'Im another existing comment',
            id: '2',
          },
          {
            comment: 'Im a new comment',
          },
        ],
      };
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichNewExceptionItemsWithComments', () => {
    test('it should add comments to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add comments to multiple exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichExceptionItemsWithOS', () => {
    test('it should add an os to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const osTypes: OsTypeArray = ['windows'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows'],
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add multiple os tags to all exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const osTypes: OsTypeArray = ['windows', 'macos'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows', 'macos'],
        },
        {
          ...getExceptionListItemSchemaMock(),
          os_types: ['windows', 'macos'],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#retrieveAlertOsTypes', () => {
    test('it should retrieve os type if alert data is provided', () => {
      const alertDataMock: AlertData = {
        '@timestamp': '1234567890',
        _id: 'test-id',
        host: { os: { family: 'windows' } },
      };
      const result = retrieveAlertOsTypes(alertDataMock);
      const expected = ['windows'];
      expect(result).toEqual(expected);
    });

    test('it should return default os types if alert data is not provided', () => {
      const result = retrieveAlertOsTypes();
      const expected = ['windows', 'macos'];
      expect(result).toEqual(expected);
    });
  });

  describe('#getCodeSignatureValue', () => {
    test('it should return empty string if code_signature nested value are undefined', () => {
      // Using the unsafe casting because with our types this shouldn't be possible but there have been issues with old data having undefined values in these fields
      const payload = [{ trusted: undefined, subject_name: undefined }] as unknown as Flattened<
        CodeSignature[]
      >;
      const result = getCodeSignatureValue(payload);
      expect(result).toEqual([{ trusted: '', subjectName: '' }]);
    });
  });

  describe('#prepareExceptionItemsForBulkClose', () => {
    test('it should return no exceptionw when passed in an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual([]);
    });

    test("should not make any updates when the exception entries don't contain 'event.'", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(payload);
    });

    test("should update entry fields when they start with 'event.'", () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.kind',
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.module',
            },
          ],
        },
      ];
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: ALERT_ORIGINAL_EVENT_KIND,
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: ALERT_ORIGINAL_EVENT_MODULE,
            },
          ],
        },
      ];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(expected);
    });

    test("should strip out any comments in the exceptions for bulk close'", () => {
      const exceptionItemWithComment = {
        ...getExceptionListItemSchemaMock(),
        comments: getCommentsArrayMock(),
      };
      const payload = [exceptionItemWithComment];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual([getExceptionListItemSchemaMock()]);
    });
  });

  describe('#lowercaseHashValues', () => {
    test('it should return an empty array with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([]);
    });

    test('it should return all list items with entry hashes lowercased', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'DDDFFF' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'DDDFFF'] },
          ] as EntriesArray,
        },
      ];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'dddfff' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'dddfff'] },
          ] as EntriesArray,
        },
      ]);
    });
  });

  describe('getPrepopulatedItem', () => {
    const alertDataMock: AlertData = {
      '@timestamp': '1234567890',
      _id: 'test-id',
      file: { path: 'some-file-path', hash: { sha256: 'some-hash' } },
    };
    test('it returns prepopulated fields with empty values', () => {
      const prepopulatedItem = getPrepopulatedEndpointException({
        listId: 'some_id',
        name: 'my rule',
        codeSignature: { subjectName: '', trusted: '' },
        eventCode: '',
        alertEcsData: { ...alertDataMock, file: { path: '', hash: { sha256: '' } } },
      });

      expect(prepopulatedItem.entries).toEqual([
        {
          entries: [
            { id: '123', field: 'subject_name', operator: 'included', type: 'match', value: '' },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: '' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        { id: '123', field: 'file.path.caseless', operator: 'included', type: 'match', value: '' },
        { id: '123', field: 'file.hash.sha256', operator: 'included', type: 'match', value: '' },
        { id: '123', field: 'event.code', operator: 'included', type: 'match', value: '' },
      ]);
    });

    test('it returns prepopulated items with actual values', () => {
      const prepopulatedItem = getPrepopulatedEndpointException({
        listId: 'some_id',
        name: 'my rule',
        codeSignature: { subjectName: 'someSubjectName', trusted: 'false' },
        eventCode: 'some-event-code',
        alertEcsData: alertDataMock,
      });

      expect(prepopulatedItem.entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'someSubjectName',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some-file-path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some-hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some-event-code',
        },
      ]);
    });
  });

  describe('getFileCodeSignature', () => {
    test('it works when file.Ext.code_signature is an object', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: {
              subject_name: 'some_subject',
              trusted: 'false',
            },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: 'some_subject', trusted: 'false' }]);
    });

    test('it works when file.Ext.code_signature is nested type', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
        },
      });

      expect(codeSignatures).toEqual([
        { subjectName: 'some_subject', trusted: 'false' },
        {
          subjectName: 'some_subject_2',
          trusted: 'true',
        },
      ]);
    });

    test('it returns default when file.Ext.code_signatures values are empty', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: { subject_name: '', trusted: '' },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures is empty array', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
        file: {
          Ext: {
            code_signature: [],
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures does not exist', () => {
      const codeSignatures = getFileCodeSignature({
        _id: '123',
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });
  });

  describe('getProcessCodeSignature', () => {
    test('it works when file.Ext.code_signature is an object', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: {
              subject_name: 'some_subject',
              trusted: 'false',
            },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: 'some_subject', trusted: 'false' }]);
    });

    test('it works when file.Ext.code_signature is nested type', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
        },
      });

      expect(codeSignatures).toEqual([
        { subjectName: 'some_subject', trusted: 'false' },
        {
          subjectName: 'some_subject_2',
          trusted: 'true',
        },
      ]);
    });

    test('it returns default when file.Ext.code_signatures values are empty', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: { subject_name: '', trusted: '' },
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures is empty array', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
        process: {
          Ext: {
            code_signature: [],
          },
        },
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });

    test('it returns default when file.Ext.code_signatures does not exist', () => {
      const codeSignatures = getProcessCodeSignature({
        _id: '123',
      });

      expect(codeSignatures).toEqual([{ subjectName: '', trusted: '' }]);
    });
  });

  describe('defaultEndpointExceptionItems', () => {
    test('it should return pre-populated Endpoint items for non-specified event code', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        file: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
          path: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        event: {
          code: 'some event code',
        },
        'event.code': 'some event code',
      });

      expect(defaultItems[0].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some event code',
        },
      ]);
      expect(defaultItems[1].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject_2',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'true' },
          ],
          field: 'file.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'file.path.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'file.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'some event code',
        },
      ]);
    });
  });
  describe('ransomware protection exception items', () => {
    test('it should return pre-populated ransomware items for event code `ransomware`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          Ext: {
            code_signature: [
              { subject_name: 'some_subject', trusted: 'false' },
              { subject_name: 'some_subject_2', trusted: 'true' },
            ],
          },
          executable: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        Ransomware: {
          feature: 'some ransomware feature',
        },
        event: {
          code: 'ransomware',
        },
        'event.code': 'ransomware',
      });

      expect(defaultItems[0].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'false' },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'Ransomware.feature',
          operator: 'included',
          type: 'match',
          value: 'some ransomware feature',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'ransomware',
        },
      ]);
      expect(defaultItems[1].entries).toEqual([
        {
          entries: [
            {
              id: '123',
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'some_subject_2',
            },
            { id: '123', field: 'trusted', operator: 'included', type: 'match', value: 'true' },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
          id: '123',
        },
        {
          id: '123',
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
        },
        {
          id: '123',
          field: 'Ransomware.feature',
          operator: 'included',
          type: 'match',
          value: 'some ransomware feature',
        },
        {
          id: '123',
          field: 'event.code',
          operator: 'included',
          type: 'match',
          value: 'ransomware',
        },
      ]);
    });
  });

  describe('memory protection exception items', () => {
    test('it should return pre-populated memory signature items for event code `memory_signature`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: 'some name',
          executable: 'some file path',
          hash: {
            sha256: 'some hash',
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'signature',
        },
        event: {
          code: 'memory_signature',
        },
        'event.code': 'memory_signature',
      });

      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'signature',
          id: '123',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
          id: '123',
        },
        {
          field: 'process.name.caseless',
          operator: 'included',
          type: 'match',
          value: 'some name',
          id: '123',
        },
        {
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
          id: '123',
        },
      ]);
    });

    test('it should return pre-populated memory signature items for event code `memory_signature` and skip Empty', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: '', // name is empty
          // executable: '',  left intentionally commented
          hash: {
            sha256: 'some hash',
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'signature',
        },
        event: {
          code: 'memory_signature',
        },
        'event.code': 'memory_signature',
      });

      // should not contain name or executable
      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'signature',
          id: '123',
        },
        {
          field: 'process.hash.sha256',
          operator: 'included',
          type: 'match',
          value: 'some hash',
          id: '123',
        },
      ]);
    });

    test('it should return pre-populated memory shellcode items for event code `shellcode_thread`', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: 'some name',
          executable: 'some file path',
          Ext: {
            token: {
              integrity_level_name: 'high',
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'shellcode_thread',
          self_injection: true,
        },
        event: {
          code: 'shellcode_thread',
        },
        Target: {
          process: {
            thread: {
              Ext: {
                start_address_allocation_offset: 0,
                start_address_bytes_disasm_hash: 'a disam hash',
                start_address_details: {
                  allocation_type: 'PRIVATE',
                  allocation_size: 4000,
                  region_size: 4000,
                  region_protection: 'RWX',
                  memory_pe: {
                    imphash: 'a hash',
                  },
                },
              },
            },
          },
        },
        'event.code': 'shellcode_thread',
      });

      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'shellcode_thread',
          id: '123',
        },
        {
          field: 'Memory_protection.self_injection',
          operator: 'included',
          type: 'match',
          value: 'true',
          id: '123',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: 'some file path',
          id: '123',
        },
        {
          field: 'process.name.caseless',
          operator: 'included',
          type: 'match',
          value: 'some name',
          id: '123',
        },
        {
          field: 'process.Ext.token.integrity_level_name',
          operator: 'included',
          type: 'match',
          value: 'high',
          id: '123',
        },
      ]);
    });

    test('it should return pre-populated memory shellcode items for event code `shellcode_thread` and skip empty', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        process: {
          name: '', // name is empty
          // executable: '',  left intentionally commented
          Ext: {
            token: {
              integrity_level_name: 'high',
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          feature: 'shellcode_thread',
          self_injection: true,
        },
        event: {
          code: 'shellcode_thread',
        },
        'event.code': 'shellcode_thread',
        Target: {
          process: {
            thread: {
              Ext: {
                start_address_allocation_offset: 0,
                start_address_bytes_disasm_hash: 'a disam hash',
                start_address_details: {
                  // allocation_type: '', left intentionally commented
                  allocation_size: 4000,
                  region_size: 4000,
                  region_protection: 'RWX',
                  memory_pe: {
                    imphash: 'a hash',
                  },
                },
              },
            },
          },
        },
      });

      // no name, no exceutable, no allocation_type
      expect(defaultItems[0].entries).toEqual([
        {
          field: 'Memory_protection.feature',
          operator: 'included',
          type: 'match',
          value: 'shellcode_thread',
          id: '123',
        },
        {
          field: 'Memory_protection.self_injection',
          operator: 'included',
          type: 'match',
          value: 'true',
          id: '123',
        },
        {
          field: 'process.Ext.token.integrity_level_name',
          operator: 'included',
          type: 'match',
          value: 'high',
          id: '123',
        },
      ]);
    });
  });
  describe('behavior protection exception items', () => {
    test('it should return pre-populated behavior protection items', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        rule: {
          id: '123',
        },
        process: {
          command_line: 'command_line',
          executable: 'some file path',
          parent: {
            executable: 'parent file path',
          },
          code_signature: {
            subject_name: 'subject-name',
            trusted: 'true',
          },
        },
        event: {
          code: 'behavior',
        },
        'event.code': 'behavior',
        file: {
          path: 'fake-file-path',
          name: 'fake-file-name',
        },
        source: {
          ip: '0.0.0.0',
        },
        destination: {
          ip: '0.0.0.0',
        },
        registry: {
          path: 'registry-path',
          value: 'registry-value',
          data: {
            strings: 'registry-strings',
          },
        },
        dll: {
          path: 'dll-path',
          code_signature: {
            subject_name: 'dll-code-signature-subject-name',
            trusted: 'false',
          },
          pe: {
            original_file_name: 'dll-pe-original-file-name',
          },
        },
        dns: {
          question: {
            name: 'dns-question-name',
            type: 'dns-question-type',
          },
        },
        user: {
          id: '0987',
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          id: '123',
          field: 'rule.id',
          operator: 'included' as const,
          type: 'match' as const,
          value: '123',
        },
        {
          id: '123',
          field: 'process.executable.caseless',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.command_line',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'command_line',
        },
        {
          id: '123',
          field: 'process.parent.executable',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'parent file path',
        },
        {
          id: '123',
          field: 'process.code_signature.subject_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'subject-name',
        },
        {
          id: '123',
          field: 'file.path',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'fake-file-path',
        },
        {
          id: '123',
          field: 'file.name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'fake-file-name',
        },
        {
          id: '123',
          field: 'source.ip',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0.0.0.0',
        },
        {
          id: '123',
          field: 'destination.ip',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0.0.0.0',
        },
        {
          id: '123',
          field: 'registry.path',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'registry-path',
        },
        {
          id: '123',
          field: 'registry.value',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'registry-value',
        },
        {
          id: '123',
          field: 'registry.data.strings',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'registry-strings',
        },
        {
          id: '123',
          field: 'dll.path',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-path',
        },
        {
          id: '123',
          field: 'dll.code_signature.subject_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-code-signature-subject-name',
        },
        {
          id: '123',
          field: 'dll.pe.original_file_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-pe-original-file-name',
        },
        {
          id: '123',
          field: 'dns.question.name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dns-question-name',
        },
        {
          id: '123',
          field: 'dns.question.type',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dns-question-type',
        },
        {
          id: '123',
          field: 'user.id',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0987',
        },
      ]);
    });
    test('it should return pre-populated behavior protection fields and skip empty', () => {
      const defaultItems = defaultEndpointExceptionItems('list_id', 'my_rule', {
        _id: '123',
        rule: {
          id: '123',
        },
        process: {
          // command_line: 'command_line', intentionally left commented
          executable: 'some file path',
          parent: {
            executable: 'parent file path',
          },
          code_signature: {
            subject_name: 'subject-name',
            trusted: 'true',
          },
        },
        event: {
          code: 'behavior',
        },
        'event.code': 'behavior',
        file: {
          // path: 'fake-file-path', intentionally left commented
          name: 'fake-file-name',
        },
        source: {
          ip: '0.0.0.0',
        },
        destination: {
          ip: '0.0.0.0',
        },
        // intentionally left commented
        // registry: {
        // path: 'registry-path',
        // value: 'registry-value',
        // data: {
        // strings: 'registry-strings',
        // },
        // },
        dll: {
          path: 'dll-path',
          code_signature: {
            subject_name: 'dll-code-signature-subject-name',
            trusted: 'false',
          },
          pe: {
            original_file_name: 'dll-pe-original-file-name',
          },
        },
        dns: {
          question: {
            name: 'dns-question-name',
            type: 'dns-question-type',
          },
        },
        user: {
          id: '0987',
        },
      });

      expect(defaultItems[0].entries).toEqual([
        {
          id: '123',
          field: 'rule.id',
          operator: 'included' as const,
          type: 'match' as const,
          value: '123',
        },
        {
          id: '123',
          field: 'process.executable.caseless',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'some file path',
        },
        {
          id: '123',
          field: 'process.parent.executable',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'parent file path',
        },
        {
          id: '123',
          field: 'process.code_signature.subject_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'subject-name',
        },
        {
          id: '123',
          field: 'file.name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'fake-file-name',
        },
        {
          id: '123',
          field: 'source.ip',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0.0.0.0',
        },
        {
          id: '123',
          field: 'destination.ip',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0.0.0.0',
        },
        {
          id: '123',
          field: 'dll.path',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-path',
        },
        {
          id: '123',
          field: 'dll.code_signature.subject_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-code-signature-subject-name',
        },
        {
          id: '123',
          field: 'dll.pe.original_file_name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dll-pe-original-file-name',
        },
        {
          id: '123',
          field: 'dns.question.name',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dns-question-name',
        },
        {
          id: '123',
          field: 'dns.question.type',
          operator: 'included' as const,
          type: 'match' as const,
          value: 'dns-question-type',
        },
        {
          id: '123',
          field: 'user.id',
          operator: 'included' as const,
          type: 'match' as const,
          value: '0987',
        },
      ]);
    });
  });

  describe('Auto-populate Rule Exceptions with Alert highlighted fields', () => {
    const name = 'Exception name';
    const endpointCapabilties = [
      'isolation',
      'kill_process',
      'suspend_process',
      'running_processes',
      'get_file',
      'execute',
      'upload_file',
    ];
    const alertData: AlertData = {
      'kibana.alert.rule.category': 'Custom Query Rule',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.execution.uuid': '28b687e3-8e16-48aa-91b8-bf044d366c2d',
      '@timestamp': '2023-06-05T11:11:32.870Z',
      agent: {
        id: 'f4f86e7c-29bd-4655-b7d0-a3d08ad0c322',
        type: 'endpoint',
      },
      process: {
        parent: {
          pid: 1,
        },
        group_leader: {
          name: 'fake leader',
          entity_id: 'ubi00k5f1o',
        },
        name: 'malware writer',
        pid: 2,
        entity_id: 'ycrj6wvrt4',
        executable: 'C:/malware.exe',
        hash: {
          sha1: 'fake sha1',
          sha256: 'fake sha256',
          md5: 'fake md5',
        },
      },
      'event.agent_id_status': 'auth_metadata_missing',
      'event.sequence': 57,
      'event.ingested': '2023-06-05T11:10:27Z',
      'event.code': 'malicious_file',
      'event.kind': 'signal',
      'event.module': 'endpoint',
      'event.action': 'deletion',
      'event.id': 'c3b60ce3-6569-4136-854a-f0cc9f546339',
      'event.category': 'malware',
      'event.type': 'creation',
      'event.dataset': 'endpoint',
      'kibana.alert.rule.uuid': '123',
      'kibana.alert.rule.exceptions_list': [
        {
          id: 'endpoint_list',
          list_id: 'endpoint_list',
          namespace_type: 'agnostic',
          type: 'endpoint',
        },
      ],
      Endpoint: {
        capabilities: endpointCapabilties,
      },
      _id: 'b9edb05a090729be2077b99304542d6844973843dec43177ac618f383df44a6d',
      destination: {
        port: 443,
      },
      source: {
        // @ts-expect-error
        ports: [1, 2, 4],
      },
      flow: {
        final: false,
        skip: true,
      },
    };
    const expectedHighlightedFields = [
      {
        id: 'host.name',
      },
      {
        id: 'agent.id',
        overrideField: 'agent.status',
        label: 'Agent status',
      },
      {
        id: 'user.name',
      },
      {
        id: 'cloud.provider',
      },
      {
        id: 'cloud.region',
      },
      {
        id: 'process.executable',
      },
      {
        id: 'process.name',
      },
      {
        id: 'file.path',
      },
      {
        id: 'kibana.alert.threshold_result.cardinality.field',
        label: 'Event Cardinality',
      },
    ];
    const operator = ListOperatorEnum.INCLUDED;
    const type = ListOperatorTypeEnum.MATCH;
    const exceptionEntries: EntriesArray = [
      {
        field: 'host.name',
        operator,
        type,
        value: 'Host-yxnnos4lo3',
      },
      {
        field: 'agent.id',
        operator,
        type,
        value: 'f4f86e7c-29bd-4655-b7d0-a3d08ad0c322',
      },
      {
        field: 'user.name',
        operator,
        type,
        value: 'c09uzcpj0c',
      },
      {
        field: 'process.executable',
        operator,
        type,
        value: 'C:/malware.exe',
      },
      {
        field: 'file.path',
        operator,
        type,
        value: 'C:/fake_malware.exe',
      },

      {
        field: 'process.name',
        operator,
        type,
        value: 'malware writer',
      },
    ];
    const defaultAlertData = {
      '@timestamp': '',
      _id: '',
    };
    const expectedExceptionEntries = [
      {
        field: 'agent.id',
        operator: 'included',
        type: 'match',
        value: 'f4f86e7c-29bd-4655-b7d0-a3d08ad0c322',
      },
      {
        field: 'process.executable',
        operator: 'included',
        type: 'match',
        value: 'C:/malware.exe',
      },
      { field: 'process.name', operator: 'included', type: 'match', value: 'malware writer' },
    ];
    const expectedExceptionEntriesWithCustomHighlightedFields = [
      {
        field: 'event.type',
        operator: 'included',
        type: 'match',
        value: 'creation',
      },
      {
        field: 'agent.id',
        operator: 'included',
        type: 'match',
        value: 'f4f86e7c-29bd-4655-b7d0-a3d08ad0c322',
      },
      {
        field: 'process.executable',
        operator: 'included',
        type: 'match',
        value: 'C:/malware.exe',
      },
      { field: 'process.name', operator: 'included', type: 'match', value: 'malware writer' },
    ];
    const entriesWithMatchAny = {
      field: 'Endpoint.capabilities',
      operator,
      type: ListOperatorTypeEnum.MATCH_ANY,
      value: endpointCapabilties,
    };
    describe('buildRuleExceptionWithConditions', () => {
      it('should build conditions, name and namespace for exception correctly', () => {
        const exception = buildRuleExceptionWithConditions({ name, exceptionEntries });
        expect(exception.entries).toEqual(
          expect.arrayContaining([
            {
              field: 'host.name',
              id: '123',
              operator: 'included',
              type: 'match',
              value: 'Host-yxnnos4lo3',
            },
            {
              field: 'agent.id',
              id: '123',
              operator: 'included',
              type: 'match',
              value: 'f4f86e7c-29bd-4655-b7d0-a3d08ad0c322',
            },
            {
              field: 'user.name',
              id: '123',
              operator: 'included',
              type: 'match',
              value: 'c09uzcpj0c',
            },
            {
              field: 'process.executable',
              id: '123',
              operator: 'included',
              type: 'match',
              value: 'C:/malware.exe',
            },
          ])
        );
        expect(exception.name).toEqual(name);
        expect(exception.namespace_type).toEqual('single');
      });
    });
    describe('buildExceptionEntriesFromAlertFields', () => {
      it('should return empty entries if highlightedFields values are empty', () => {
        const entries = buildExceptionEntriesFromAlertFields({ highlightedFields: [], alertData });
        expect(entries).toEqual([]);
      });
      it('should return empty entries if alertData values are empty', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: expectedHighlightedFields,
          alertData: defaultAlertData,
        });
        expect(entries).toEqual([]);
      });
      it('should build exception entries with "match" operator in case the field key has single value', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: expectedHighlightedFields,
          alertData,
        });
        expect(entries).toEqual(expectedExceptionEntries);
      });
      it('should build exception entries with "match" operator and  ensure that integer value is converted to a string', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: [
            ...expectedHighlightedFields,
            {
              id: 'destination.port',
            },
          ],
          alertData,
        });
        expect(alertData).toEqual(
          expect.objectContaining({
            destination: {
              port: 443,
            },
          })
        );
        expect(entries).toEqual([
          ...expectedExceptionEntries,
          {
            field: 'destination.port',
            operator: 'included',
            type: 'match',
            value: '443',
          },
        ]);
      });
      it('should build exception entries with "match" operator and ensure that boolean value is converted to a string', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: [
            ...expectedHighlightedFields,
            {
              id: 'flow.final',
            },
            { id: 'flow.skip' },
          ],
          alertData,
        });
        expect(alertData).toEqual(
          expect.objectContaining({
            flow: {
              final: false,
              skip: true,
            },
          })
        );
        expect(entries).toEqual([
          ...expectedExceptionEntries,
          {
            field: 'flow.final',
            operator: 'included',
            type: 'match',
            value: 'false',
          },
          {
            field: 'flow.skip',
            operator: 'included',
            type: 'match',
            value: 'true',
          },
        ]);
      });
      it('should build the exception entries with "match_any" in case the field key has multiple values', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: [
            ...expectedHighlightedFields,
            {
              id: 'Endpoint.capabilities',
            },
          ],
          alertData,
        });
        expect(entries).toEqual([...expectedExceptionEntries, entriesWithMatchAny]);
      });
      it('should build the exception entries with "match_any" in case the field key has multiple values and ensure that the array value is converted to a string', () => {
        const entries = buildExceptionEntriesFromAlertFields({
          highlightedFields: [
            ...expectedHighlightedFields,
            {
              id: 'source.ports',
            },
          ],
          alertData,
        });
        expect(entries).toEqual([
          ...expectedExceptionEntries,
          {
            field: 'source.ports',
            operator,
            type: ListOperatorTypeEnum.MATCH_ANY,
            value: ['1', '2', '4'],
          },
        ]);
      });
    });

    describe('filterHighlightedFields', () => {
      const prefixesToExclude = ['agent', 'cloud'];
      it('should not filter any field if no prefixes passed ', () => {
        const filteredFields = filterHighlightedFields(expectedHighlightedFields, [], alertData);
        expect(filteredFields).toEqual(expectedHighlightedFields);
      });
      it('should not filter any field if no fields passed ', () => {
        const filteredFields = filterHighlightedFields([], prefixesToExclude, alertData);
        expect(filteredFields).toEqual([]);
      });
      it('should filter out the passed prefixes successfully', () => {
        const filteredFields = filterHighlightedFields(
          expectedHighlightedFields,
          prefixesToExclude,
          alertData
        );
        expect(filteredFields).not.toEqual(
          expect.arrayContaining([
            {
              id: 'agent.id',
              overrideField: 'agent.status',
              label: 'Agent status',
            },
            {
              id: 'observer.serial_number',
              overrideField: 'agent.status',
              label: 'Agent status',
            },
            {
              id: 'cloud.provider',
            },
            {
              id: 'cloud.region',
            },
          ])
        );
      });
    });
    describe('getAlertHighlightedFields', () => {
      const baseGeneratedAlertHighlightedFields = [
        {
          id: 'host.name',
        },
        // Fields used in support of Response Actions
        ...SUPPORTED_AGENT_ID_ALERT_FIELDS.map((fieldPath) => {
          return {
            id: fieldPath,
            overrideField: 'agent.status',
            label: 'Agent status',
          };
        }),
        {
          id: 'Endpoint.policy.applied.artifacts.global.channel',
        },
        {
          id: 'user.name',
        },
        {
          id: 'cloud.provider',
        },
        {
          id: 'cloud.region',
        },
        {
          id: 'orchestrator.cluster.id',
        },
        {
          id: 'orchestrator.cluster.name',
        },
        {
          id: 'container.image.name',
        },
        {
          id: 'container.image.tag',
        },
        {
          id: 'orchestrator.namespace',
        },
        {
          id: 'orchestrator.resource.parent.type',
        },
        {
          id: 'orchestrator.resource.type',
        },
        {
          id: 'process.executable',
        },
        {
          id: 'file.path',
        },
      ];
      const allHighlightFields = [
        ...baseGeneratedAlertHighlightedFields,
        {
          id: 'file.name',
        },
        {
          id: 'file.hash.sha256',
        },
        {
          id: 'file.directory',
        },
        {
          id: 'process.name',
        },
        {
          id: 'file.Ext.quarantine_path',
          label: 'Quarantined file path',
          overrideField: 'quarantined.path',
        },
      ];
      it('should return the highlighted fields correctly when eventCode, eventCategory and RuleType are in the alertData', () => {
        const res = getAlertHighlightedFields(alertData, []);
        expect(res).toEqual(allHighlightFields);
      });
      it('should return highlighted fields without the file.Ext.quarantine_path when "event.code" is not in the alertData', () => {
        const alertDataWithoutEventCode = { ...alertData, 'event.code': null };
        const res = getAlertHighlightedFields(alertDataWithoutEventCode, []);
        expect(res).toEqual([
          ...baseGeneratedAlertHighlightedFields,
          {
            id: 'file.name',
          },
          {
            id: 'file.hash.sha256',
          },
          {
            id: 'file.directory',
          },
          {
            id: 'process.name',
          },
        ]);
      });
      it('should return highlighted fields without the file and process props when "event.category" is not in the alertData', () => {
        const alertDataWithoutEventCategory = { ...alertData, 'event.category': null };
        const res = getAlertHighlightedFields(alertDataWithoutEventCategory, []);
        expect(res).toEqual([
          ...baseGeneratedAlertHighlightedFields,
          {
            id: 'file.Ext.quarantine_path',
            label: 'Quarantined file path',
            overrideField: 'quarantined.path',
          },
        ]);
      });
      it('should return the process highlighted fields correctly when eventCategory is an array', () => {
        const alertDataEventCategoryProcessArray = { ...alertData, 'event.category': ['process'] };
        const res = getAlertHighlightedFields(alertDataEventCategoryProcessArray, []);
        expect(res).not.toEqual(
          expect.arrayContaining([
            { id: 'file.name' },
            { id: 'file.hash.sha256' },
            { id: 'file.directory' },
          ])
        );
        expect(res).toEqual(
          expect.arrayContaining([
            { id: 'process.name' },
            { id: 'process.parent.name' },
            { id: 'process.args' },
          ])
        );
      });
      it('should return all highlighted fields even when the "kibana.alert.rule.type" is not in the alertData', () => {
        const alertDataWithoutEventCategory = { ...alertData, 'kibana.alert.rule.type': null };
        const res = getAlertHighlightedFields(alertDataWithoutEventCategory, []);
        expect(res).toEqual(allHighlightFields);
      });
      it('should return all highlighted fields when there are no fields to be filtered out', () => {
        jest.mock('./highlighted_fields_config', () => ({ highlightedFieldsPrefixToExclude: [] }));

        const res = getAlertHighlightedFields(alertData, []);
        expect(res).toEqual(allHighlightFields);
      });
      it('should exclude the "agent.id" from highlighted fields when agent.type is not "endpoint"', () => {
        jest.mock('./highlighted_fields_config', () => ({ highlightedFieldsPrefixToExclude: [] }));

        const alertDataWithoutAgentType = { ...alertData, agent: { ...alertData.agent, type: '' } };
        const res = getAlertHighlightedFields(alertDataWithoutAgentType, []);

        expect(res).toEqual(allHighlightFields.filter((field) => field.id !== AGENT_ID));
      });
      it('should exclude the "agent.id" from highlighted fields when "kibana.alert.rule.uuid" is not part of the alertData', () => {
        jest.mock('./highlighted_fields_config', () => ({ highlightedFieldsPrefixToExclude: [] }));

        const alertDataWithoutRuleUUID = { ...alertData, 'kibana.alert.rule.uuid': '' };
        const res = getAlertHighlightedFields(alertDataWithoutRuleUUID, []);

        expect(res).toEqual(allHighlightFields.filter((field) => field.id !== AGENT_ID));
      });
      it('should include custom highlighted fields', () => {
        const res = getAlertHighlightedFields(alertData, ['event.type']);
        expect(res).toEqual([{ id: 'event.type' }, ...allHighlightFields]);
      });
    });
    describe('getPrepopulatedRuleExceptionWithHighlightFields', () => {
      it('should not create any exception and return null if there are no highlighted fields', () => {
        jest.spyOn(mockHelpers, 'getAlertHighlightedFields').mockReturnValue([]);

        const res = getPrepopulatedRuleExceptionWithHighlightFields({
          alertData: defaultAlertData,
          exceptionItemName: '',
          ruleCustomHighlightedFields: [],
        });
        expect(res).toBe(null);
      });
      it('should not create any exception and return null if there are exception entries generated', () => {
        jest.spyOn(mockHelpers, 'buildExceptionEntriesFromAlertFields').mockReturnValue([]);

        const res = getPrepopulatedRuleExceptionWithHighlightFields({
          alertData: defaultAlertData,
          exceptionItemName: '',
          ruleCustomHighlightedFields: [],
        });
        expect(res).toBe(null);
      });
      it('should create a new exception and populate its entries with the highlighted fields', () => {
        const exception = getPrepopulatedRuleExceptionWithHighlightFields({
          alertData,
          exceptionItemName: name,
          ruleCustomHighlightedFields: [],
        });

        expect(exception?.entries).toEqual(
          expectedExceptionEntries.map((entry) => ({ ...entry, id: '123' }))
        );
        expect(exception?.name).toEqual(name);
      });
      it('should create a new exception and populate its entries with the custom highlighted fields', () => {
        const exception = getPrepopulatedRuleExceptionWithHighlightFields({
          alertData,
          exceptionItemName: name,
          ruleCustomHighlightedFields: ['event.type'],
        });

        expect(exception?.entries).toEqual(
          expectedExceptionEntriesWithCustomHighlightedFields.map((entry) => ({
            ...entry,
            id: '123',
          }))
        );
        expect(exception?.name).toEqual(name);
      });
    });
  });
});
