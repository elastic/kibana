/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiAccordion,
} from '@elastic/eui';

import { useKibana } from '../../../../../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { METRIC_TYPE, track } from '../../../../../../common/lib/telemetry';
import * as i18n from '../../../../../common/translations';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../common/detection_engine/constants';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../../common/api/detection_engine/rule_management';
import type {
  AlertSuppressionMissingFieldsStrategy,
  AlertSuppressionDuration,
} from '../../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import {
  Field,
  getUseField,
  useFormData,
  useForm,
  FIELD_TYPES,
  fieldValidators,
} from '../../../../../../shared_imports';
import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import {
  SuppressionFieldsSelector,
  MissingFieldsStrategySelector,
  SuppressionDurationSelector,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DEFAULT_DURATION,
} from '../../../../../rule_creation/components/alert_suppression_edit';
import { AlertSuppressionDurationType } from '../../../../../common/types';

const CommonUseField = getUseField({ component: Field });
type AlertSuppressionEditActions =
  | BulkActionEditTypeEnum['add_alert_suppression']
  | BulkActionEditTypeEnum['delete_alert_suppression']
  | BulkActionEditTypeEnum['set_alert_suppression'];

interface AlertSuppressionFormData {
  alertSuppressionFields: string[];
  alertSuppressionDurationType: AlertSuppressionDurationType;
  alertSuppressionDuration: AlertSuppressionDuration;
  alertSuppressionMissingFields?: AlertSuppressionMissingFieldsStrategy;
  isSuppressionFieldsOverwriteEnabled: boolean;
  isDurationOverwriteEnabled: boolean;
  isMissingFieldsStrategyOverwriteEnabled: boolean;
  isSuppressionRemovalEnabled: boolean;
}

const getSchema = (maxFieldsNumber: number) => {
  return {
    [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: {
      fieldsToValidateOnChange: [ALERT_SUPPRESSION_FIELDS_FIELD_NAME],
      validations: [
        {
          validator: fieldValidators.maxLengthField({
            message: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_MAX_LENGTH_ERROR,
            length: maxFieldsNumber,
          }),
        },
      ],
    },
    [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: {},
    [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
      [ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME]: {},
      [ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME]: {},
    },
    [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: {
      label: i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_MISSING_FIELDS_LABEL,
    },
    isSuppressionFieldsOverwriteEnabled: {
      type: FIELD_TYPES.CHECKBOX,
      label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_OVERWRITE_LABEL,
    },
    isDurationOverwriteEnabled: {
      type: FIELD_TYPES.CHECKBOX,
      label: 'Set duration of suppression',
    },
    isMissingFieldsStrategyOverwriteEnabled: {
      type: FIELD_TYPES.CHECKBOX,
      label: 'Set suppression for missing fields',
    },
    isSuppressionRemovalEnabled: {
      type: FIELD_TYPES.CHECKBOX,
      label: 'Remove suppression in all selected rules',
    },
  };
};

const initialFormData: AlertSuppressionFormData = {
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: [],
  isSuppressionFieldsOverwriteEnabled: false,
  isDurationOverwriteEnabled: false,
  isMissingFieldsStrategyOverwriteEnabled: false,
  isSuppressionRemovalEnabled: false,
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: AlertSuppressionDurationType.PerRuleExecution,
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: ALERT_SUPPRESSION_DEFAULT_DURATION,
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
};

const getFormConfig = (editAction: AlertSuppressionEditActions) =>
  editAction === BulkActionEditTypeEnum.add_alert_suppression
    ? {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_TITLE,
      }
    : {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_TITLE,
      };

interface AlertSuppressionFormProps {
  editAction: AlertSuppressionEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const AlertSuppressionFormComponent = ({
  editAction,
  rulesCount,
  onClose,
  onConfirm,
}: AlertSuppressionFormProps) => {
  const schema = useMemo(
    () => getSchema(editAction === 'delete_alert_suppression' ? Infinity : 3),
    [editAction]
  );
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const { formTitle } = getFormConfig(editAction);

  const [
    {
      isSuppressionFieldsOverwriteEnabled,
      isSuppressionRemovalEnabled,
      isDurationOverwriteEnabled,
      isMissingFieldsStrategyOverwriteEnabled,
    },
  ] = useFormData<AlertSuppressionFormData>({
    form,
    watch: [
      'isSuppressionFieldsOverwriteEnabled',
      'isSuppressionRemovalEnabled',
      'isDurationOverwriteEnabled',
      'isMissingFieldsStrategyOverwriteEnabled',
    ],
  });
  const [_, { indexPatterns }] = useFetchIndex(defaultPatterns, false);

  const handleSubmit = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const durationValue =
      data[ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME] ===
      AlertSuppressionDurationType.PerTimePeriod
        ? data[ALERT_SUPPRESSION_DURATION_FIELD_NAME]
        : null;

    const suppressionConfig = {
      missing_fields_strategy: isMissingFieldsStrategyOverwriteEnabled
        ? data[ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]
        : undefined,
      duration: isDurationOverwriteEnabled ? durationValue : undefined,
    };

    const suppressionPayload = data.isSuppressionRemovalEnabled
      ? {
          value: {
            group_by: [],
          },
          type: BulkActionEditTypeEnum.set_alert_suppression,
        }
      : {
          value: {
            group_by: data.alertSuppressionFields,
            ...suppressionConfig,
          },
          type: data.isSuppressionFieldsOverwriteEnabled
            ? BulkActionEditTypeEnum.set_alert_suppression
            : editAction,
        };

    onConfirm(suppressionPayload);
    track(METRIC_TYPE.CLICK, suppressionPayload.type);
  };

  return (
    <BulkEditFormWrapper form={form} onClose={onClose} onSubmit={handleSubmit} title={formTitle}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="iInCircle" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_INFO}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      <SuppressionFieldsSelector
        suppressibleFields={indexPatterns.fields}
        disabled={isSuppressionRemovalEnabled}
      />

      {editAction === BulkActionEditTypeEnum.add_alert_suppression ? (
        <CommonUseField
          path="isSuppressionFieldsOverwriteEnabled"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteAlertSuppression',
            'data-test-subj': 'bulkEditRulesOverwriteAlertSuppression',
          }}
        />
      ) : (
        <CommonUseField
          path="isSuppressionRemovalEnabled"
          componentProps={{
            idAria: 'bulkEditRulesRemoveAlertSuppression',
            'data-test-subj': 'bulkEditRulesRemoveAlertSuppression',
          }}
        />
      )}
      {isSuppressionFieldsOverwriteEnabled && (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="warning"
            size="s"
            data-test-subj="bulkEditRulesAlertSuppressionWarning"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setAlertSuppressionWarningCallout"
              defaultMessage="You’re about to overwrite alert suppression for the {rulesCount, plural, one {# rule} other {# rules}} you selected. To apply and save the changes, click Save."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
      {isSuppressionRemovalEnabled && (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="warning"
            size="s"
            data-test-subj="bulkEditRulesRemoveAlertSuppressionWarning"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.removeAllAlertSuppressionWarningCallout"
              defaultMessage="You’re about to remove alert suppression for the {rulesCount, plural, one {# rule} other {# rules}} you selected. To apply and save the changes, click Save."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}

      <EuiSpacer size="m" />
      <CommonUseField
        path="isDurationOverwriteEnabled"
        componentProps={{
          idAria: 'bulkEditRulesAlertSuppressionDurationOverwriteEnabled',
          'data-test-subj': 'bulkEditAlertSuppressionDurationOverwriteEnabled',
          euiFieldProps: {
            isDisabled: isSuppressionRemovalEnabled,
          },
        }}
      />
      <EuiAccordion
        id="alertSuppressionDurationAccordion"
        arrowDisplay="none"
        forceState={isDurationOverwriteEnabled ? 'open' : 'closed'}
        paddingSize="m"
      >
        <SuppressionDurationSelector disabled={isSuppressionRemovalEnabled} />
      </EuiAccordion>

      <EuiSpacer size="m" />
      <CommonUseField
        path="isMissingFieldsStrategyOverwriteEnabled"
        componentProps={{
          idAria: 'bulkEditRulesAlertSuppressionMissingFieldsStrategyOverwriteEnabled',
          'data-test-subj': 'bulkEditAlertSuppressionMissingFieldsStrategyOverwriteEnabled',
          euiFieldProps: {
            isDisabled: isSuppressionRemovalEnabled,
          },
        }}
      />
      <EuiAccordion
        id="alertMissingFieldStrategyAccordion"
        arrowDisplay="none"
        forceState={isMissingFieldsStrategyOverwriteEnabled ? 'open' : 'closed'}
        paddingSize="m"
      >
        <MissingFieldsStrategySelector disabled={isSuppressionRemovalEnabled} />
      </EuiAccordion>
    </BulkEditFormWrapper>
  );
};

export const AlertSuppressionForm = React.memo(AlertSuppressionFormComponent);
AlertSuppressionForm.displayName = 'AlertSuppressionForm';
