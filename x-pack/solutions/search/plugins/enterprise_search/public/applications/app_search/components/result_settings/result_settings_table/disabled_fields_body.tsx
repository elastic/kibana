/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiTableRow, EuiTableRowCell, EuiText, EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ResultSettingsLogic } from '..';

export const DisabledFieldsBody: React.FC = () => {
  const { schemaConflicts } = useValues(ResultSettingsLogic);
  return (
    <>
      {Object.keys(schemaConflicts).map((fieldName) => (
        <EuiTableRow key={fieldName}>
          <EuiTableRowCell colSpan={6}>
            <EuiText size="s" data-test-subj="ResultSettingFieldName">
              <code>{fieldName}</code>
            </EuiText>
            <EuiHealth color="warning">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.fieldTypeConflictText',
                {
                  defaultMessage: 'Field-type conflict',
                }
              )}
            </EuiHealth>
          </EuiTableRowCell>
        </EuiTableRow>
      ))}
    </>
  );
};
