/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { extractValidationMessages } from '../../../../../../rule_creation/logic/extract_validation_messages';
import type { FormWithWarningsSubmitHandler } from '../../../../../../../common/hooks/use_form_with_warnings';
import { useFormWithWarnings } from '../../../../../../../common/hooks/use_form_with_warnings';
import { Form } from '../../../../../../../shared_imports';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import type {
  DiffableAllFields,
  DiffableRule,
} from '../../../../../../../../common/api/detection_engine';
import { useFieldUpgradeContext } from '../../rule_upgrade/field_upgrade_context';
import { useFieldEditFormContext } from '../context/field_edit_form_context';
import type { RuleFieldEditComponentProps } from './rule_field_edit_component_props';
import { useConfirmValidationErrorsModal } from '../../../../../../../common/hooks/use_confirm_validation_errors_modal';
import {
  VALIDATION_WARNING_CODE_FIELD_NAME_MAP,
  VALIDATION_WARNING_CODES,
} from '../../../../../../rule_creation/constants/validation_warning_codes';

type RuleFieldEditComponent = React.ComponentType<RuleFieldEditComponentProps>;

export type FieldDeserializerFn = (
  defaultRuleFieldValue: FormData,
  finalDiffableRule: DiffableRule
) => FormData;

interface RuleFieldEditFormWrapperProps {
  component: RuleFieldEditComponent;
  ruleFieldFormSchema?: FormSchema;
  deserializer?: FieldDeserializerFn;
  serializer?: (formData: FormData) => FormData;
}

/**
 * RuleFieldEditFormWrapper component manages form state and renders "Save" and "Cancel" buttons.
 *
 * @param {Object} props - Component props.
 * @param {React.ComponentType} props.component - Field component to be wrapped.
 * @param {FormSchema} props.ruleFieldFormSchema - Configuration schema for the field.
 * @param {Function} props.deserializer - Deserializer prepares initial form data. It converts field value from a DiffableRule format to a format used by the form.
 * @param {Function} props.serializer - Serializer prepares form data for submission. It converts form data back to a DiffableRule format.
 */
export function RuleFieldEditFormWrapper({
  component: FieldComponent,
  ruleFieldFormSchema,
  deserializer,
  serializer,
}: RuleFieldEditFormWrapperProps) {
  const { registerForm } = useFieldEditFormContext();
  const { fieldName, finalDiffableRule, setReadOnlyMode, setRuleFieldResolvedValue } =
    useFieldUpgradeContext();

  const deserialize = useCallback(
    (defaultValue: FormData): FormData =>
      deserializer ? deserializer(defaultValue, finalDiffableRule) : defaultValue,
    [deserializer, finalDiffableRule]
  );

  const { modal, confirmValidationErrors } = useConfirmValidationErrorsModal();

  const handleSubmit = useCallback<FormWithWarningsSubmitHandler>(
    async (formData: FormData, isValid: boolean, { warnings }) => {
      const warningMessages = extractValidationMessages(
        warnings,
        VALIDATION_WARNING_CODE_FIELD_NAME_MAP
      );

      if (!isValid || !(await confirmValidationErrors(warningMessages))) {
        return;
      }

      setRuleFieldResolvedValue({
        ruleId: finalDiffableRule.rule_id,
        fieldName: fieldName as keyof DiffableAllFields,
        resolvedValue: formData[fieldName],
      });
      setReadOnlyMode();
    },
    [
      confirmValidationErrors,
      fieldName,
      finalDiffableRule.rule_id,
      setReadOnlyMode,
      setRuleFieldResolvedValue,
    ]
  );

  const { form } = useFormWithWarnings({
    schema: ruleFieldFormSchema,
    defaultValue: getDefaultValue(fieldName, finalDiffableRule),
    deserializer: deserialize,
    serializer,
    onSubmit: handleSubmit,
    options: {
      warningValidationCodes: VALIDATION_WARNING_CODES,
      stripEmptyFields: false,
    },
  });

  useEffect(() => registerForm(form), [registerForm, form]);

  // form.isValid has `undefined` value until all fields are dirty.
  // Run the validation upfront to visualize form validity state.
  useEffect(() => {
    form.validate();
  }, [form]);

  return (
    <Form form={form}>
      {modal}
      <FieldComponent
        finalDiffableRule={finalDiffableRule}
        setFieldValue={form.setFieldValue}
        resetForm={form.reset}
      />
    </Form>
  );
}

function getDefaultValue(fieldName: string, finalDiffableRule: Record<string, unknown>): FormData {
  return { [fieldName]: finalDiffableRule[fieldName] };
}
