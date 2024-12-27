/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { EuiTable, EuiTableBody } from '@elastic/eui';

import { ResultSettingsLogic } from '..';

import { ColumnHeaders } from './column_headers';
import { DisabledFieldsBody } from './disabled_fields_body';
import { DisabledFieldsHeader } from './disabled_fields_header';
import { NonTextFieldsBody } from './non_text_fields_body';
import { NonTextFieldsHeader } from './non_text_fields_header';
import { TextFieldsBody } from './text_fields_body';
import { TextFieldsHeader } from './text_fields_header';

import './result_settings_table.scss';

export const ResultSettingsTable: React.FC = () => {
  const { schemaConflicts, textResultFields, nonTextResultFields } = useValues(ResultSettingsLogic);

  // TODO This table currently has mutiple theads, which is invalid html. We could change these subheaders to be EuiTableRow instead of EuiTableHeader
  // to alleviate the issue.
  return (
    <EuiTable className="resultSettingsTable" responsiveBreakpoint={false}>
      <ColumnHeaders />
      {!!Object.keys(textResultFields).length && (
        <EuiTableBody>
          <TextFieldsHeader />
          <TextFieldsBody />
        </EuiTableBody>
      )}
      {!!Object.keys(nonTextResultFields).length && (
        <EuiTableBody className="resultSettingsTable__subHeader">
          <NonTextFieldsHeader />
          <NonTextFieldsBody />
        </EuiTableBody>
      )}
      {!!Object.keys(schemaConflicts).length && (
        <EuiTableBody className="resultSettingsTable__subHeader">
          <DisabledFieldsHeader />
          <DisabledFieldsBody />
        </EuiTableBody>
      )}
    </EuiTable>
  );
};
