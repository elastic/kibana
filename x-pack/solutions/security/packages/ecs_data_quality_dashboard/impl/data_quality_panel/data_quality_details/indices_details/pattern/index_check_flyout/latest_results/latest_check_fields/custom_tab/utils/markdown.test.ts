/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EcsVersion } from '@elastic/ecs';

import {
  getAllCustomMarkdownComments,
  getCustomMarkdownComment,
  getCustomMarkdownTableRows,
} from './markdown';
import { mockCustomFields } from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { EMPTY_STAT } from '../../../../../../../../constants';
import { ECS_IS_A_PERMISSIVE_SCHEMA } from '../../../../translations';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('getCustomMarkdownComment', () => {
  test('it returns a comment for custom fields with the expected field counts and ECS version', () => {
    expect(getCustomMarkdownComment({ customFieldsCount: 2 })).toEqual(`#### 2 Custom field mappings

These fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.

${ECS_IS_A_PERMISSIVE_SCHEMA}
`);
  });
});

describe('getCustomMarkdownTableRows', () => {
  test('it returns the expected table rows', () => {
    expect(getCustomMarkdownTableRows(mockCustomFields)).toEqual(
      '| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |'
    );
  });
});

describe('getAllCustomMarkdownComments', () => {
  test('it returns the expected comment', () => {
    expect(
      getAllCustomMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        customFields: mockCustomFields,
        incompatibleFieldsCount: 3,
        ecsCompliantFieldsCount: 2,
        sameFamilyFieldsCount: 0,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      `#### 4 Custom field mappings\n\nThese fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.\n\nECS is a permissive schema. If your events have additional data that cannot be mapped to ECS, you can simply add them to your events, using custom field names.\n`,
      '#### Custom fields - auditbeat-custom-index-1\n\n\n| Field | Index mapping type | \n|-------|--------------------|\n| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |\n',
    ]);
  });

  test('it returns the expected comment without ILM Phase when isILMAvailable is false', () => {
    expect(
      getAllCustomMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        customFields: mockCustomFields,
        incompatibleFieldsCount: 3,
        ecsCompliantFieldsCount: 2,
        sameFamilyFieldsCount: 0,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n',
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      `#### 4 Custom field mappings\n\nThese fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.\n\nECS is a permissive schema. If your events have additional data that cannot be mapped to ECS, you can simply add them to your events, using custom field names.\n`,
      '#### Custom fields - auditbeat-custom-index-1\n\n\n| Field | Index mapping type | \n|-------|--------------------|\n| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |\n',
    ]);
  });

  test('it returns the expected comment without Size when Size is undefined', () => {
    expect(
      getAllCustomMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        customFields: mockCustomFields,
        incompatibleFieldsCount: 3,
        ecsCompliantFieldsCount: 2,
        sameFamilyFieldsCount: 0,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n',
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      `#### 4 Custom field mappings\n\nThese fields are not defined by the Elastic Common Schema (ECS), version ${EcsVersion}.\n\nECS is a permissive schema. If your events have additional data that cannot be mapped to ECS, you can simply add them to your events, using custom field names.\n`,
      '#### Custom fields - auditbeat-custom-index-1\n\n\n| Field | Index mapping type | \n|-------|--------------------|\n| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |\n',
    ]);
  });
});
