/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../../../app_logic';
import { UNIVERSAL_LANGUAGE } from '../../../../constants';
import { EngineDetails } from '../../../engine/types';

import { AuditLogsModalLogic } from '../audit_logs_modal/audit_logs_modal_logic';

import { renderEngineLink, renderLastChangeLink } from './engine_link_helpers';
import {
  ACTIONS_COLUMN,
  CREATED_AT_COLUMN,
  LAST_UPDATED_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from './shared_columns';
import { EnginesTableProps } from './types';

const LANGUAGE_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'language',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.language', {
    defaultMessage: 'Language',
  }),
  dataType: 'string',
  render: (language: string) => language || UNIVERSAL_LANGUAGE,
};

export const EnginesTable: React.FC<EnginesTableProps> = ({
  items,
  loading,
  noItemsMessage,
  pagination,
  onChange,
}) => {
  const {
    myRole: { canManageEngines },
  } = useValues(AppLogic);

  const { showModal: showAuditLogModal } = useActions(AuditLogsModalLogic);

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (name: string) => renderEngineLink(name),
    },
    CREATED_AT_COLUMN,
    {
      ...LAST_UPDATED_COLUMN,
      render: (dateString: string, engineDetails) => {
        return renderLastChangeLink(dateString, () => {
          showAuditLogModal(engineDetails.name);
        });
      },
    },
    LANGUAGE_COLUMN,
    DOCUMENT_COUNT_COLUMN,
    FIELD_COUNT_COLUMN,
  ];

  if (canManageEngines) {
    columns.push(ACTIONS_COLUMN);
  }

  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      noItemsMessage={noItemsMessage}
    />
  );
};
