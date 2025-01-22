/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { isValidIndexName } from '../../../../utils/validate_index_name';
import { useIndexNameSearch } from '../../../hooks/api/use_index_name_search';

interface ConnectorIndexNameFormProps {
  indexName: string;
  isDisabled?: boolean;
  onChange: (output: string) => void;
}

export const ConnectorIndexNameForm: React.FC<ConnectorIndexNameFormProps> = ({
  indexName,
  onChange,
  isDisabled,
}) => {
  const [query, setQuery] = useState('');
  const { data: indexNames, isLoading: isLoadingIndices, refetch } = useIndexNameSearch(query);

  useEffect(() => {
    refetch();
  }, [query, refetch]);

  const [newIndexName, setNewIndexName] = useState(indexName);

  useEffect(() => {
    onChange(newIndexName);
  }, [newIndexName, onChange]);

  return (
    <EuiForm fullWidth>
      <EuiFormRow
        error={
          !isValidIndexName(newIndexName || '')
            ? i18n.translate('xpack.serverlessSearch.connectors.indexNameErrorText', {
                defaultMessage:
                  'Names should be lowercase and cannot contain spaces or special characters.',
              })
            : undefined
        }
        isInvalid={!!newIndexName && !isValidIndexName(newIndexName)}
        label={i18n.translate('xpack.serverlessSearch.connectors.config.indexNameLabel', {
          defaultMessage: 'Create or select an index',
        })}
        fullWidth
        helpText={i18n.translate('xpack.serverlessSearch.connectors.indexNameInputHelpText', {
          defaultMessage:
            'Names should be lowercase and cannot contain spaces or special characters.',
        })}
      >
        <EuiComboBox
          async
          isClearable={false}
          customOptionText={i18n.translate(
            'xpack.serverlessSearch.connectors.config.createIndexLabel',
            {
              defaultMessage: 'The connector will create the index {searchValue}',
              values: { searchValue: '{searchValue}' },
            }
          )}
          isDisabled={isDisabled}
          isLoading={isLoadingIndices}
          onChange={(values) => {
            if (values[0].value) {
              setNewIndexName(values[0].value);
            }
          }}
          onCreateOption={(value) => setNewIndexName(value)}
          onSearchChange={(value) => setQuery(value)}
          options={(indexNames?.index_names || []).map((name) => ({
            label: name,
            value: name,
          }))}
          selectedOptions={newIndexName ? [{ label: newIndexName, value: newIndexName }] : []}
          singleSelection
        />
      </EuiFormRow>
    </EuiForm>
  );
};
