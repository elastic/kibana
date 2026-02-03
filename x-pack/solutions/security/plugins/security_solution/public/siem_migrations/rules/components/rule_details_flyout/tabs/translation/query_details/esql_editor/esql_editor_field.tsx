/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFormRow } from '@elastic/eui';
import { ESQLLangEditor, type DataErrorsControl } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';
import { convertToQueryType } from '../../../../../../../../common/components/query_bar/convert_to_query_type';
import type { FieldValueQueryBar } from '../../../../../../../../detection_engine/rule_creation_ui/components/query_bar_field';
import type { FieldHook } from '../../../../../../../../shared_imports';

const DATA_ERRORS_STORAGE_KEY = 'siemMigrations_esqlEditorDataErrorsEnabled' as const;

interface EsqlEditorFieldProps {
  field: FieldHook<FieldValueQueryBar>;
  idAria?: string;
  dataTestSubj: string;
}

export const EsqlEditorField: React.FC<EsqlEditorFieldProps> = React.memo(
  ({ field, idAria, dataTestSubj }) => {
    const { value: fieldValue, setValue: setFieldValue } = field;

    const [isDataErrorsEnabled, setIsDataErrorsEnabled] = useLocalStorage(
      DATA_ERRORS_STORAGE_KEY,
      true
    );
    const dataErrorsControl = useMemo<DataErrorsControl>(
      () => ({ enabled: isDataErrorsEnabled ?? true, onChange: setIsDataErrorsEnabled }),
      [isDataErrorsEnabled, setIsDataErrorsEnabled]
    );

    const query = useMemo(
      () => ({ esql: fieldValue.query.query as string }),
      [fieldValue.query.query]
    );

    const onQueryChange = useCallback(
      (newQuery: AggregateQuery) => {
        if (!deepEqual(fieldValue.query, newQuery)) {
          const esqlQuery = convertToQueryType(newQuery);
          setFieldValue({ ...fieldValue, query: esqlQuery });
        }
      },
      [fieldValue, setFieldValue]
    );

    const onQuerySubmit = useCallback(
      async (newQuery?: AggregateQuery) => {
        if (newQuery) {
          onQueryChange(newQuery);
        }
      },
      [onQueryChange]
    );

    return (
      <EuiFormRow
        fullWidth
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
      >
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={onQueryChange}
          onTextLangQuerySubmit={onQuerySubmit}
          dataErrorsControl={dataErrorsControl}
          disableSubmitAction
          hideQueryHistory
          hasOutline
          editorIsInline
          hideRunQueryButton
          expandToFitQueryOnMount
        />
      </EuiFormRow>
    );
  }
);
EsqlEditorField.displayName = 'EsqlEditorField';
