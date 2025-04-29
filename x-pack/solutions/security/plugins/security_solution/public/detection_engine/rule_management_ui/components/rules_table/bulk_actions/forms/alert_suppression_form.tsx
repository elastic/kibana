/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiRadioGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIcon,
} from '@elastic/eui';

import { useKibana } from '../../../../../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../../common/lib/telemetry';
import * as i18n from '../../../../../common/translations';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../common/detection_engine/constants';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../../common/api/detection_engine/rule_management';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
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
  UseMultiFields,
} from '../../../../../../shared_imports';
import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { DurationInput } from '../../../../../rule_creation/components/duration_input';
const CommonUseField = getUseField({ component: Field });

type AlertSuppressionEditActions =
  | BulkActionEditTypeEnum['add_alert_suppression']
  | BulkActionEditTypeEnum['delete_alert_suppression']
  | BulkActionEditTypeEnum['set_alert_suppression'];

enum GroupByOptions {
  PerRuleExecution = 'per-rule-execution',
  PerTimePeriod = 'per-time-period',
}

interface AlertSuppressionFormData {
  groupBy: string[];
  groupByRadioSelection: GroupByOptions;
  groupByDuration: AlertSuppressionDuration;
  suppressionMissingFields?: AlertSuppressionMissingFieldsStrategy;
  overwriteGroupBy: boolean;
  overwriteTimeAndMissingFields: boolean;
  removeSuppression: boolean;
}

const getSchema = (maxFieldsNumber: number) => {
  return {
    groupBy: {
      fieldsToValidateOnChange: ['groupBy'],
      type: FIELD_TYPES.COMBO_BOX,
      validations: [
        {
          validator: fieldValidators.emptyField(
            i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_REQUIRED_ERROR
          ),
        },
        {
          validator: fieldValidators.maxLengthField({
            message: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_MAX_LENGTH_ERROR,
            length: maxFieldsNumber,
          }),
        },
      ],
    },
    groupByRadioSelection: {},
    groupByDuration: {
      value: {},
      unit: {},
    },
    suppressionMissingFields: {
      label: i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_MISSING_FIELDS_LABEL,
    },
    overwriteGroupBy: {
      type: FIELD_TYPES.CHECKBOX,
      label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_OVERWRITE_LABEL,
    },
    overwriteTimeAndMissingFields: {
      type: FIELD_TYPES.CHECKBOX,
      label: 'Overwrite existing time periods and missing fields',
    },
    removeSuppression: {
      type: FIELD_TYPES.CHECKBOX,
      label: 'Remove suppression in all selected rules',
    },
  };
};

const initialFormData: AlertSuppressionFormData = {
  groupBy: [],
  overwriteGroupBy: false,
  overwriteTimeAndMissingFields: false,
  removeSuppression: false,
  groupByRadioSelection: GroupByOptions.PerRuleExecution,
  groupByDuration: {
    value: 5,
    unit: 'm',
  },
  suppressionMissingFields: DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
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
    () => getSchema(editAction === 'delete_alert_suppression' ? 100 : 3),
    [editAction]
  );
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const { formTitle } = getFormConfig(editAction);

  const [{ overwriteGroupBy, removeSuppression }] = useFormData({
    form,
    watch: ['overwriteGroupBy', 'removeSuppression'],
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

    const event = data.overwriteGroupBy
      ? TELEMETRY_EVENT.SET_ALERT_SUPPRESSION
      : editAction === 'delete_alert_suppression'
      ? TELEMETRY_EVENT.DELETE_ALERT_SUPPRESSION
      : TELEMETRY_EVENT.ADD_ALERT_SUPPRESSION;
    track(METRIC_TYPE.CLICK, event);

    const suppressionConfig = data.overwriteTimeAndMissingFields
      ? {
          suppression_config: {
            missing_fields_strategy: data.suppressionMissingFields,
            duration:
              data.groupByRadioSelection === GroupByOptions.PerTimePeriod
                ? data.groupByDuration
                : undefined,
          },
        }
      : {};

    onConfirm({
      value: {
        group_by: data.groupBy,
        ...suppressionConfig,
      },
      type: data.overwriteGroupBy ? BulkActionEditTypeEnum.set_alert_suppression : editAction,
    });
  };

  const GroupByChildren = useCallback(
    ({ groupByRadioSelection, groupByDurationUnit, groupByDurationValue }) => (
      <EuiRadioGroup
        idSelected={groupByRadioSelection.value}
        options={[
          {
            id: GroupByOptions.PerRuleExecution,
            disabled: removeSuppression,
            label: <> {i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_PER_RULE_EXECUTION_LABEL}</>,
          },
          {
            id: GroupByOptions.PerTimePeriod,
            disabled: removeSuppression,
            label: (
              <>
                {i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_PER_TIME_PERIOD_LABEL}
                <DurationInput
                  data-test-subj="alertSuppressionDurationInput"
                  durationValueField={groupByDurationValue}
                  durationUnitField={groupByDurationUnit}
                  // Suppression duration is also disabled suppression by rule execution is selected in radio button
                  isDisabled={
                    groupByRadioSelection.value !== GroupByOptions.PerTimePeriod ||
                    removeSuppression
                  }
                  minimumValue={1}
                />
              </>
            ),
          },
        ]}
        onChange={(id: string) => {
          groupByRadioSelection.setValue(id);
        }}
        data-test-subj="groupByDurationOptions"
      />
    ),
    [removeSuppression]
  );
  const AlertSuppressionMissingFields = useCallback(
    ({ suppressionMissingFields }) => (
      <EuiRadioGroup
        idSelected={suppressionMissingFields.value}
        disabled={removeSuppression}
        options={[
          {
            id: AlertSuppressionMissingFieldsStrategyEnum.suppress,
            label: i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_SUPPRESS_MISSING_FIELDS_OPTION,
          },
          {
            id: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
            label:
              i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_DO_NOT_SUPPRESS_MISSING_FIELDS_OPTION,
          },
        ]}
        onChange={(id: string) => {
          suppressionMissingFields.setValue(id);
        }}
        data-test-subj="suppressionMissingFieldsOptions"
      />
    ),
    [removeSuppression]
  );
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
      <CommonUseField
        path="groupBy"
        config={{
          ...schema.groupBy,
          // label: i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_GROUP_BY_LABEL,
          label: (
            <div>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  {i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_GROUP_BY_LABEL}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {'Select field(s) to use for suppressing extra alerts'}
              </EuiText>
            </div>
          ),
        }}
        componentProps={{
          idAria: 'bulkEditRulesAlertSuppression',
          'data-test-subj': 'bulkEditRulesAlertSuppression',
          euiFieldProps: {
            isDisabled: removeSuppression,
            fullWidth: true,
            placeholder: 'Select a field',
            noSuggestions: false,
            options: fieldOptions,
          },
        }}
      />
      {editAction === BulkActionEditTypeEnum.add_alert_suppression ? (
        <CommonUseField
          path="overwriteGroupBy"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteAlertSuppression',
            'data-test-subj': 'bulkEditRulesOverwriteAlertSuppression',
          }}
        />
      ) : (
        <CommonUseField
          path="removeSuppression"
          componentProps={{
            idAria: 'bulkEditRulesRemoveAlertSuppression',
            'data-test-subj': 'bulkEditRulesRemoveAlertSuppression',
          }}
        />
      )}

      {overwriteGroupBy && (
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

      {removeSuppression && (
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

      <EuiSpacer size="l" />

      <CommonUseField
        path="overwriteTimeAndMissingFields"
        componentProps={{
          idAria: 'bulkEditRulesOverwriteAlertSuppression',
          'data-test-subj': 'bulkEditRulesOverwriteAlertSuppression',
          euiFieldProps: {
            isDisabled: removeSuppression,
          },
        }}
      />
      <EuiFormRow data-test-subj="alertSuppressionDuration">
        <UseMultiFields
          fields={{
            groupByRadioSelection: {
              path: 'groupByRadioSelection',
            },
            groupByDurationValue: {
              path: 'groupByDuration.value',
            },
            groupByDurationUnit: {
              path: 'groupByDuration.unit',
            },
          }}
        >
          {GroupByChildren}
        </UseMultiFields>
      </EuiFormRow>

      <EuiFormRow
        data-test-subj="alertSuppressionMissingFields"
        label={i18n.BULK_EDIT_FLYOUT_FORM_ALERT_SUPPRESSION_MISSING_FIELDS_LABEL}
        fullWidth
      >
        <UseMultiFields
          fields={{
            suppressionMissingFields: {
              path: 'suppressionMissingFields',
            },
          }}
        >
          {AlertSuppressionMissingFields}
        </UseMultiFields>
      </EuiFormRow>
    </BulkEditFormWrapper>
  );
};

export const AlertSuppressionForm = React.memo(AlertSuppressionFormComponent);
AlertSuppressionForm.displayName = 'AlertSuppressionForm';
