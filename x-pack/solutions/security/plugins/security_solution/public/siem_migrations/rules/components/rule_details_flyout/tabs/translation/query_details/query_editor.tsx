/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VALIDATION_WARNING_CODES } from '../../../../../../../detection_engine/rule_creation/constants/validation_warning_codes';
import { useFormWithWarnings } from '../../../../../../../common/hooks/use_form_with_warnings';
import { Field, Form, getUseField } from '../../../../../../../shared_imports';
import type { RuleTranslationSchema } from '../types';
import { schema } from '../schema';
import { EsqlEditor } from './esql_editor';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface QueryEditorProps {
  query: string;
  ruleName: string;
  onSave: (ruleName: string, ruleQuery: string) => void;
  onCancel: () => void;
}

export const QueryEditor: React.FC<QueryEditorProps> = React.memo(
  ({ query, ruleName, onSave, onCancel }) => {
    const formDefaultValue: RuleTranslationSchema = useMemo(() => {
      return {
        ruleName,
        queryBar: {
          query: {
            query,
            language: 'esql',
          },
        },
      };
    }, [query, ruleName]);
    const { form } = useFormWithWarnings<RuleTranslationSchema>({
      defaultValue: formDefaultValue,
      options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
      schema,
    });

    const handleSaveButtonClick = useCallback(async () => {
      const { data, isValid } = await form.submit();
      if (isValid) {
        onSave(data.ruleName, data.queryBar.query.query);
      }
    }, [form, onSave]);

    return (
      <Form form={form} data-test-subj="ruleMigrationTranslationTab">
        <EuiFlexGroup
          direction="row"
          gutterSize="none"
          justifyContent="flexEnd"
          alignItems="flexStart"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onCancel} size="xs">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="save" onClick={handleSaveButtonClick} size="xs">
              {i18n.SAVE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <CommonUseField
          path="ruleName"
          componentProps={{
            idAria: 'ruleMigrationTranslationRuleName',
            'data-test-subj': 'ruleMigrationTranslationRuleName',
            euiFieldProps: {
              fullWidth: true,
            },
          }}
        />
        <EsqlEditor path="queryBar" />
      </Form>
    );
  }
);
QueryEditor.displayName = 'QueryEditor';
