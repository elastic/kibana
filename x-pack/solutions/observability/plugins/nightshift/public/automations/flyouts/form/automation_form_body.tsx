/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  isSlackTrigger,
  SLACK_THREAD_ACTION,
  type AutomationFormValues,
  type TriggerFormValues,
} from './automation_form_values';
import { AutomationActionsSection } from './actions/automation_actions_section';
import { AutomationInstructions } from './instructions/automation_instructions';
import { AutomationTriggerSection } from './triggers/trigger_section';
import { AutomationTagsField, tagLabels } from './tags_field';
import { FormSection } from './section_header';

const labels = {
  name: i18n.translate('xpack.nightshift.automations.flyout.nameLabel', { defaultMessage: 'Name' }),
  nameRequired: i18n.translate('xpack.nightshift.automations.flyout.nameRequired', {
    defaultMessage: 'Give this automation a name.',
  }),
  namePlaceholder: i18n.translate('xpack.nightshift.automations.flyout.namePlaceholder', {
    defaultMessage: 'Name this automation',
  }),
  description: i18n.translate('xpack.nightshift.automations.descriptionLabel', {
    defaultMessage: 'Description',
  }),
  optional: i18n.translate('xpack.nightshift.automations.flyout.optional', {
    defaultMessage: 'Optional',
  }),
  descriptionPlaceholder: i18n.translate('xpack.nightshift.automations.descriptionPlaceholder', {
    defaultMessage: 'What does this automation do?',
  }),
};

export const AutomationFormBody = ({
  values,
  tagSuggestions,
  isNameInvalid,
  readOnly = false,
  showIdentityFields = true,
  usedToday,
  savedLimit,
  onRaiseLimit,
  onChange,
}: {
  values: AutomationFormValues;
  tagSuggestions: string[];
  isNameInvalid: boolean;
  readOnly?: boolean;
  showIdentityFields?: boolean;
  usedToday?: number;
  savedLimit?: number;
  onRaiseLimit?: (limit: number) => void;
  onChange: (changes: Partial<AutomationFormValues>) => void;
}) => {
  const getActionForTrigger = (trigger?: TriggerFormValues): Partial<AutomationFormValues> => {
    if (trigger && isSlackTrigger(trigger)) return { slackAction: SLACK_THREAD_ACTION };
    if (values.slackAction?.target === 'thread') return { slackAction: undefined };
    return {};
  };

  return (
    <>
      {showIdentityFields && (
        <EuiFormRow
          fullWidth
          label={labels.name}
          isInvalid={isNameInvalid}
          error={isNameInvalid ? labels.nameRequired : undefined}
        >
          <EuiFieldText
            fullWidth
            compressed
            value={values.name}
            disabled={readOnly}
            placeholder={labels.namePlaceholder}
            isInvalid={isNameInvalid}
            onChange={(event) => onChange({ name: event.target.value })}
            data-test-subj="automationName"
          />
        </EuiFormRow>
      )}
      {showIdentityFields && <EuiSpacer size="m" />}
      {showIdentityFields && (
        <EuiFormRow
          fullWidth
          label={labels.description}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {labels.optional}
            </EuiText>
          }
        >
          <EuiTextArea
            fullWidth
            compressed
            rows={3}
            resize="vertical"
            maxLength={200}
            placeholder={labels.descriptionPlaceholder}
            value={values.description}
            disabled={readOnly}
            onChange={(event) => onChange({ description: event.target.value })}
            onBlur={(event) => onChange({ description: event.target.value.trim() })}
            data-test-subj="automationDescription"
          />
        </EuiFormRow>
      )}
      {showIdentityFields && <EuiSpacer size="m" />}
      {showIdentityFields && (
        <EuiFormRow
          fullWidth
          label={tagLabels.tags}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {labels.optional}
            </EuiText>
          }
        >
          <AutomationTagsField
            tags={values.tags}
            suggestions={tagSuggestions}
            onChange={(tags) => onChange({ tags })}
            disabled={readOnly}
          />
        </EuiFormRow>
      )}
      {showIdentityFields && <EuiSpacer size="s" />}
      <FormSection>
        <AutomationTriggerSection
          trigger={values.trigger}
          dailyDispatchLimit={values.dailyDispatchLimit}
          onTriggerChange={(trigger) => onChange({ trigger, ...getActionForTrigger(trigger) })}
          onDailyDispatchLimitChange={(dailyDispatchLimit) => onChange({ dailyDispatchLimit })}
          usedToday={usedToday}
          savedLimit={savedLimit}
          onRaiseLimit={onRaiseLimit}
          readOnly={readOnly}
        />
      </FormSection>
      <FormSection>
        <AutomationInstructions
          instructions={values.instructions}
          mode={values.mode}
          onInstructionsChange={(instructions) => onChange({ instructions })}
          onModeChange={(mode) => onChange({ mode })}
          readOnly={readOnly}
        />
      </FormSection>
      <FormSection>
        <AutomationActionsSection
          slackAction={values.slackAction}
          onSlackActionChange={(slackAction) => onChange({ slackAction })}
          readOnly={readOnly}
        />
      </FormSection>
    </>
  );
};
