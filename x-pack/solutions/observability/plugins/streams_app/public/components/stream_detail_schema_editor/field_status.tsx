/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type FieldStatus = 'inherited' | 'mapped' | 'unmapped';

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

export const FieldStatus = ({ status }: { status: FieldStatus }) => {
  return (
    <>
      <EuiBadge color={FIELD_STATUS_MAP[status].color}>{FIELD_STATUS_MAP[status].label}</EuiBadge>
    </>
  );
};
