/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../../common/lib/telemetry';
import * as i18n from '../../../../../../detections/pages/detection_engine/rules/translations';

import { useFetchIndex } from '../../../../../../common/containers/source';

import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../../common/api/detection_engine/rule_management';

import type { FormSchema } from '../../../../../../shared_imports';
import {
  Field,
  getUseField,
  useFormData,
  useForm,
  FIELD_TYPES,
  fieldValidators,
} from '../../../../../../shared_imports';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';

const CommonUseField = getUseField({ component: Field });

type InvestigationFieldsEditActions =
  | BulkActionEditTypeEnum['add_investigation_fields']
  | BulkActionEditTypeEnum['delete_investigation_fields']
  | BulkActionEditTypeEnum['set_investigation_fields'];

interface InvestigationFieldsFormData {
  investigationFields: string[];
  overwrite: boolean;
}

const schema: FormSchema<InvestigationFieldsFormData> = {
  investigationFields: {
    fieldsToValidateOnChange: ['investigationFields'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.BULK_EDIT_FLYOUT_FORM_ADD_INVESTIGATION_FIELDS_REQUIRED_ERROR
        ),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INVESTIGATION_FIELDS_OVERWRITE_LABEL,
  },
};

const initialFormData: InvestigationFieldsFormData = {
  investigationFields: [],
  overwrite: false,
};

const getFormConfig = (editAction: InvestigationFieldsEditActions) =>
  editAction === BulkActionEditTypeEnum.add_investigation_fields
    ? {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INVESTIGATION_FIELDS_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INVESTIGATION_FIELDS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_INVESTIGATION_FIELDS_TITLE,
      }
    : {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INVESTIGATION_FIELDS_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INVESTIGATION_FIELDS_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_INVESTIGATION_FIELDS_TITLE,
      };

interface InvestigationFieldsFormProps {
  editAction: InvestigationFieldsEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const InvestigationFieldsFormComponent = ({
  editAction,
  rulesCount,
  onClose,
  onConfirm,
}: InvestigationFieldsFormProps) => {
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const { indexHelpText, indexLabel, formTitle } = getFormConfig(editAction);

  const [{ overwrite }] = useFormData({
    form,
    watch: ['overwrite'],
  });
  const [_, { indexPatterns }] = useFetchIndex(defaultPatterns, false);
  const fieldOptions = indexPatterns.fields.map((field) => ({
    label: field.name,
  }));

  const handleSubmit = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const event = data.overwrite
      ? TELEMETRY_EVENT.SET_INVESTIGATION_FIELDS
      : editAction === 'delete_investigation_fields'
      ? TELEMETRY_EVENT.DELETE_INVESTIGATION_FIELDS
      : TELEMETRY_EVENT.ADD_INVESTIGATION_FIELDS;
    track(METRIC_TYPE.CLICK, event);

    onConfirm({
      value: { field_names: data.investigationFields },
      type: data.overwrite ? BulkActionEditTypeEnum.set_investigation_fields : editAction,
    });
  };

  return (
    <BulkEditFormWrapper form={form} onClose={onClose} onSubmit={handleSubmit} title={formTitle}>
      <CommonUseField
        path="investigationFields"
        config={{ ...schema.investigationFields, label: indexLabel, helpText: indexHelpText }}
        componentProps={{
          idAria: 'bulkEditRulesInvestigationFields',
          'data-test-subj': 'bulkEditRulesInvestigationFields',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: fieldOptions,
          },
        }}
      />
      {editAction === BulkActionEditTypeEnum.add_investigation_fields && (
        <CommonUseField
          path="overwrite"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteInvestigationFields',
            'data-test-subj': 'bulkEditRulesOverwriteInvestigationFields',
          }}
        />
      )}
      {overwrite && (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="warning"
            size="s"
            data-test-subj="bulkEditRulesInvestigationFieldsWarning"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setInvestigationFieldsWarningCallout"
              defaultMessage="You’re about to overwrite custom highlighted fields for the {rulesCount, plural, one {# rule} other {# rules}} you selected. To apply and save the changes, click Save."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
    </BulkEditFormWrapper>
  );
};

export const InvestigationFieldsForm = React.memo(InvestigationFieldsFormComponent);
InvestigationFieldsForm.displayName = 'InvestigationFieldsForm';
