/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import deepEqual from 'fast-deep-equal';
import { EuiFormRow } from '@elastic/eui';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';
import { convertToQueryType } from '../../../../../../../../common/components/query_bar/convert_to_query_type';
import type { FieldValueQueryBar } from '../../../../../../../../detection_engine/rule_creation_ui/components/query_bar_field';
import type { FieldHook } from '../../../../../../../../shared_imports';

interface EsqlEditorFieldProps {
  field: FieldHook<FieldValueQueryBar>;
  idAria?: string;
  dataTestSubj: string;
}

export const EsqlEditorField: React.FC<EsqlEditorFieldProps> = React.memo(
  ({ field, idAria, dataTestSubj }) => {
    const { value: fieldValue, setValue: setFieldValue } = field;

    const onQueryChange = useCallback(
      (newQuery: AggregateQuery) => {
        const { query } = fieldValue;
        if (!deepEqual(query, newQuery)) {
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
          query={{ esql: fieldValue.query.query as string }}
          onTextLangQueryChange={onQueryChange}
          onTextLangQuerySubmit={onQuerySubmit}
          hideRunQueryText={true}
          disableSubmitAction={true}
          hideTimeFilterInfo={true}
          hideQueryHistory={true}
          hasOutline={true}
          editorIsInline={true}
          hideRunQueryButton={true}
        />
      </EuiFormRow>
    );
  }
);
EsqlEditorField.displayName = 'EsqlEditorField';
