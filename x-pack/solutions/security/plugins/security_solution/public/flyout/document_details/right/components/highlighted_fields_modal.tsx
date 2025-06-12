/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { FC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  useGeneratedHtmlId,
  EuiBadge,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { RuleResponse, RuleUpdateProps } from '../../../../../common/api/detection_engine';
import { getDefineStepsData } from '../../../../detection_engine/common/helpers';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { useDefaultIndexPattern } from '../../../../detection_engine/rule_management/hooks/use_default_index_pattern';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useUpdateRule } from '../../../../detection_engine/rule_management/logic/use_update_rule';
import {
  Form,
  Field,
  getUseField,
  useForm,
  FIELD_TYPES,
  fieldValidators,
} from '../../../../shared_imports';
import type { FormSchema } from '../../../../shared_imports';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import {
  HIGHLIGHTED_FIELDS_MODAL_CANCEL_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_DESCRIPTION_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_SAVE_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_DEFAULT_FIELDS_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_CUSTOM_FIELDS_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_TITLE_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_TEST_ID,
} from './test_ids';

const SUCCESSFULLY_SAVED_RULE = (ruleName: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.update.successfullySavedRuleTitle', {
    values: { ruleName },
    defaultMessage: '{ruleName} was saved',
  });

const ADD_CUSTOM_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.right.investigation.highlightedFields.modalAddCustomFieldLabel',
  { defaultMessage: 'Add custom' }
);

const SELECT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.flyout.right.investigation.highlightedFields.modalSelectPlaceholder',
  { defaultMessage: 'Select or search for options' }
);

const CommonUseField = getUseField({ component: Field });

interface InvestigationFieldsFormData {
  customHighlightedFields: string[];
}

const schema: FormSchema<InvestigationFieldsFormData> = {
  customHighlightedFields: {
    fieldsToValidateOnChange: ['customHighlightedFields'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [{ validator: fieldValidators.emptyField('error') }],
  },
};

const formConfig = {
  ...schema.customHighlightedFields,
  label: ADD_CUSTOM_FIELD_LABEL,
};

interface HighlightedFieldsModalProps {
  /**
   * The data formatted for field browser
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * The rule
   */
  rule: RuleResponse;
  /**
   * The custom highlighted fields
   */
  customHighlightedFields: string[];
  /**
   * The function to set the edit loading state
   */
  setIsEditLoading: (isEditLoading: boolean) => void;
  /**
   * The function to set the modal visible state
   */
  setIsModalVisible: (isModalVisible: boolean) => void;
}

/**
 * Modal for editing the highlighted fields of a rule.
 */
export const HighlightedFieldsModal: FC<HighlightedFieldsModalProps> = ({
  rule,
  customHighlightedFields,
  dataFormattedForFieldBrowser,
  setIsEditLoading,
  setIsModalVisible,
}) => {
  const defaultIndexPattern = useDefaultIndexPattern();
  const { dataSourceType, index, dataViewId } = useMemo(() => getDefineStepsData(rule), [rule]);
  const { indexPattern: dataView } = useRuleIndexPattern({
    dataSourceType,
    index: index.length > 0 ? index : defaultIndexPattern, // fallback to default index pattern if rule has no index patterns
    dataViewId,
  });

  const { addSuccess } = useAppToasts();
  const { euiTheme } = useEuiTheme();
  const { mutateAsync: updateRule } = useUpdateRule();
  const modalTitleId = useGeneratedHtmlId();

  const defaultFields = useHighlightedFields({
    dataFormattedForFieldBrowser,
    investigationFields: customHighlightedFields,
    type: 'default',
  });
  const defaultFieldsArray = useMemo(() => Object.keys(defaultFields), [defaultFields]);

  const options = useMemo(() => {
    const allFields = dataView.fields;
    return allFields
      .filter((field) => !defaultFieldsArray.includes(field.name))
      .map((field) => ({ label: field.name }));
  }, [dataView, defaultFieldsArray]);

  const customFields = useMemo(
    () => customHighlightedFields.map((field: string) => ({ label: field })),
    [customHighlightedFields]
  );

  const [selectedOptions, setSelectedOptions] = useState(customFields);

  const { form } = useForm({
    defaultValue: { customHighlightedFields: [] },
    schema,
  });

  const onCancel = useCallback(() => {
    setIsModalVisible(false);
  }, [setIsModalVisible]);

  const onSubmit = useCallback(async () => {
    setIsEditLoading(true);

    const updatedRule = await updateRule({
      ...rule,
      id: undefined,
      investigation_fields:
        selectedOptions.length > 0
          ? { field_names: selectedOptions.map((option) => option.label) }
          : undefined,
    } as RuleUpdateProps);

    addSuccess(SUCCESSFULLY_SAVED_RULE(updatedRule?.name ?? 'rule'));
    setIsEditLoading(false);
    setIsModalVisible(false);
  }, [updateRule, addSuccess, rule, setIsModalVisible, setIsEditLoading, selectedOptions]);

  const componentProps = useMemo(
    () => ({
      idAria: 'customizeHighlightedFields',
      'data-test-subj': HIGHLIGHTED_FIELDS_MODAL_CUSTOM_FIELDS_TEST_ID,
      euiFieldProps: {
        fullWidth: true,
        noSuggestions: false,
        onChange: (fields: Array<{ label: string }>) => setSelectedOptions(fields),
        options,
        placeholder: SELECT_PLACEHOLDER,
        selectedOptions,
      },
    }),
    [options, selectedOptions]
  );

  return (
    <EuiModal
      css={{ width: '600px' }}
      data-test-subj={HIGHLIGHTED_FIELDS_MODAL_TEST_ID}
      id={modalTitleId}
      onClose={onCancel}
    >
      <EuiModalHeader data-test-subj={HIGHLIGHTED_FIELDS_MODAL_TITLE_TEST_ID}>
        <EuiModalHeaderTitle id={modalTitleId} size="s">
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.highlightedFields.modalTitle"
            defaultMessage="Edit highlighted fields"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" data-test-subj={HIGHLIGHTED_FIELDS_MODAL_DESCRIPTION_TEST_ID}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.highlightedFields.modalDescription"
            defaultMessage="Changes made here will be applied to the {ruleName} rule. Any custom fields you add will be displayed in all alerts generated by this rule."
            values={{ ruleName: <b>{rule.name}</b> }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.highlightedFields.modalDefaultFieldsTitle"
            defaultMessage="Default"
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup
          data-test-subj={HIGHLIGHTED_FIELDS_MODAL_DEFAULT_FIELDS_TEST_ID}
          gutterSize="xs"
          justifyContent="flexStart"
          wrap
        >
          {defaultFieldsArray.map((field: string) => (
            <EuiFlexItem key={field} grow={false}>
              <EuiBadge color="hollow">{field}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <Form form={form}>
          <CommonUseField
            path="customHighlightedFields"
            config={formConfig}
            componentProps={componentProps}
          />
        </Form>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={HIGHLIGHTED_FIELDS_MODAL_CANCEL_BUTTON_TEST_ID}
              flush="left"
              onClick={onCancel}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.investigation.highlightedFields.modalCancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={HIGHLIGHTED_FIELDS_MODAL_SAVE_BUTTON_TEST_ID}
              fill
              onClick={onSubmit}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.investigation.highlightedFields.modalSaveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
