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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FIELD_NAME } from '../../../../shared/schema/constants';
import { ENGINES_TITLE } from '../../engines';

import { MetaEngineSchemaLogic } from '../schema_meta_engine_logic';

import { TruncatedEnginesList } from '.';

export const MetaEnginesConflictsTable: React.FC = () => {
  const { conflictingFields } = useValues(MetaEngineSchemaLogic);

  return (
    <EuiTable tableLayout="auto">
      <EuiTableHeader>
        <EuiTableHeaderCell>{FIELD_NAME}</EuiTableHeaderCell>
        <EuiTableHeaderCell>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.fieldTypeConflicts',
            { defaultMessage: 'Field type conflicts' }
          )}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell>{ENGINES_TITLE}</EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        {Object.entries(conflictingFields).map(([fieldName, conflicts]) =>
          Object.entries(conflicts).map(([fieldType, engines], i) => {
            const isFirstRow = i === 0;
            return (
              <EuiTableRow key={`${fieldName}-${fieldType}`}>
                {isFirstRow && (
                  <EuiTableRowCell
                    rowSpan={Object.values(conflicts).length}
                    data-test-subj="fieldName"
                  >
                    <code>{fieldName}</code>
                  </EuiTableRowCell>
                )}
                <EuiTableRowCell data-test-subj="fieldTypes">{fieldType}</EuiTableRowCell>
                <EuiTableRowCell data-test-subj="enginesPerFieldType">
                  <TruncatedEnginesList engines={engines} cutoff={2} />
                </EuiTableRowCell>
              </EuiTableRow>
            );
          })
        )}
      </EuiTableBody>
    </EuiTable>
  );
};
