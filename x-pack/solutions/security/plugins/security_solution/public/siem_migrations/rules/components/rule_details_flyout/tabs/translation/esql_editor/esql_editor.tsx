/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { debounceAsync } from '@kbn/securitysolution-utils';
import type { FieldValueQueryBar } from '../../../../../../../detection_engine/rule_creation_ui/components/query_bar_field';
import { esqlQueryValidatorFactory } from '../../../../../../../detection_engine/rule_creation/components/esql_query_edit/validators/esql_query_validator_factory';
import type { FieldConfig } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { EsqlEditorField } from './esql_editor_field';
import type { RuleTranslationSchema } from '../types';

interface EsqlEditorFieldProps {
  path: string;
}

export const EsqlEditor: React.FC<EsqlEditorFieldProps> = React.memo(({ path }) => {
  const queryClient = useQueryClient();

  const componentProps = useMemo(
    () => ({
      idAria: 'ruleEsqlQueryBar',
      dataTestSubj: 'ruleEsqlQueryBar',
    }),
    []
  );

  const fieldConfig: FieldConfig<FieldValueQueryBar> = useMemo(
    () => ({
      validations: [
        {
          validator: debounceAsync(esqlQueryValidatorFactory({ queryClient }), 300),
          isAsync: true,
        },
      ],
    }),
    [queryClient]
  );

  return (
    <UseField<FieldValueQueryBar, RuleTranslationSchema>
      path={path}
      component={EsqlEditorField}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
});
EsqlEditor.displayName = 'EsqlEditor';
