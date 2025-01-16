/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIELD_TYPE_MAP = {
  boolean: {
    icon: 'tokenBoolean',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableBooleanType', {
      defaultMessage: 'Boolean',
    }),
  },
  date: {
    icon: 'tokenDate',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableDateType', {
      defaultMessage: 'Date',
    }),
  },
  keyword: {
    icon: 'tokenKeyword',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableKeywordType', {
      defaultMessage: 'Keyword',
    }),
  },
  match_only_text: {
    icon: 'tokenText',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableTextType', {
      defaultMessage: 'Text',
    }),
  },
  long: {
    icon: 'tokenNumber',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (long)',
    }),
  },
  double: {
    icon: 'tokenNumber',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (double)',
    }),
  },
  ip: {
    icon: 'tokenIP',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableIpType', {
      defaultMessage: 'IP',
    }),
  },
};

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
