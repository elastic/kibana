/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToken } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';

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
      defaultMessage: 'Number',
    }),
  },
  double: {
    icon: 'tokenNumber',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number',
    }),
  },
  ip: {
    icon: 'tokenIP',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableIpType', {
      defaultMessage: 'IP',
    }),
  },
};

export const FieldType = ({ type }: { type: FieldDefinitionConfig['type'] }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiToken iconType={FIELD_TYPE_MAP[type].icon} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{`${FIELD_TYPE_MAP[type].label}`}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
