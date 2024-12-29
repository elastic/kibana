/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FIELD_NAME, FIELD_TYPE } from '../../../../shared/schema/constants';
import { ENGINES_TITLE } from '../../engines';

import { MetaEngineSchemaLogic } from '../schema_meta_engine_logic';

import { TruncatedEnginesList } from '.';

export const MetaEnginesSchemaTable: React.FC = () => {
  const { schema, fields } = useValues(MetaEngineSchemaLogic);

  return (
    <EuiTable tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{FIELD_NAME}</EuiTableHeaderCell>
        <EuiTableHeaderCell>{ENGINES_TITLE}</EuiTableHeaderCell>
        <EuiTableHeaderCell align="right">{FIELD_TYPE}</EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        <EuiTableRow>
          <EuiTableRowCell>
            <EuiText color="subdued">
              <code>id</code>
            </EuiText>
          </EuiTableRowCell>
          <EuiTableRowCell>
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.allEngines',
                { defaultMessage: 'All' }
              )}
            </EuiText>
          </EuiTableRowCell>
          <EuiTableRowCell aria-hidden />
        </EuiTableRow>
        {Object.keys(fields).map((fieldName) => {
          const fieldType = schema[fieldName];
          const engines = fields[fieldName][fieldType];

          return (
            <EuiTableRow key={fieldName}>
              <EuiTableRowCell data-test-subj="fieldName">
                <code>{fieldName}</code>
              </EuiTableRowCell>
              <EuiTableRowCell data-test-subj="engines">
                <TruncatedEnginesList engines={engines} />
              </EuiTableRowCell>
              <EuiTableRowCell align="right" data-test-subj="fieldType">
                {fieldType}
              </EuiTableRowCell>
            </EuiTableRow>
          );
        })}
      </EuiTableBody>
    </EuiTable>
  );
};
