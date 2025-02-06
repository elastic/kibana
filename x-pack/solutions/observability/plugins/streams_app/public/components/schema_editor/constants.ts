/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_CONTENT = '-----';

export const FIELD_TYPE_MAP = {
  boolean: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableBooleanType', {
      defaultMessage: 'Boolean',
    }),
  },
  date: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableDateType', {
      defaultMessage: 'Date',
    }),
  },
  keyword: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableKeywordType', {
      defaultMessage: 'Keyword',
    }),
  },
  match_only_text: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableTextType', {
      defaultMessage: 'Text (match_only_text)',
    }),
  },
  long: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (long)',
    }),
  },
  double: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (double)',
    }),
  },
  ip: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableIpType', {
      defaultMessage: 'IP',
    }),
  },
} as const;

export type FieldTypeOption = keyof typeof FIELD_TYPE_MAP;

export const FIELD_STATUS_MAP = {
  inherited: {
    color: 'hollow',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorInheritedStatusLabel', {
      defaultMessage: 'Inherited',
    }),
  },
  mapped: {
    color: 'success',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorMappedStatusLabel', {
      defaultMessage: 'Mapped',
    }),
  },
  unmapped: {
    color: 'default',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmappedStatusLabel', {
      defaultMessage: 'Unmapped',
    }),
  },
};

export type FieldStatus = keyof typeof FIELD_STATUS_MAP;

export const TABLE_COLUMNS = {
  name: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablenameHeader', {
      defaultMessage: 'Field',
    }),
  },
  type: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTabletypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  format: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableformatHeader', {
      defaultMessage: 'Format',
    }),
  },
  parent: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFieldParentHeader', {
      defaultMessage: 'Field Parent (Stream)',
    }),
  },
  status: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablestatusHeader', {
      defaultMessage: 'Status',
    }),
  },
};
