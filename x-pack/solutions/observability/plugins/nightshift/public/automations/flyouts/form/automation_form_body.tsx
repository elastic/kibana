/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AutomationFormValues } from './automation_form_values';
import { AutomationActionsSection } from './actions/automation_actions_section';
import { AutomationInstructions } from './instructions/automation_instructions';
import { AutomationTriggerSection } from './triggers/trigger_section';
import { AutomationTagsField, tagLabels } from './tags_field';

const labels = {
  name: i18n.translate('xpack.nightshift.automations.flyout.nameLabel', { defaultMessage: 'Name' }),
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
  onChange,
}: {
  values: AutomationFormValues;
  tagSuggestions: string[];
  isNameInvalid: boolean;
  readOnly?: boolean;
  showIdentityFields?: boolean;
  onChange: (changes: Partial<AutomationFormValues>) => void;
}) => (
  <>
    {showIdentityFields && (
      <EuiFormRow fullWidth label={labels.name} isInvalid={isNameInvalid}>
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
          rows={1}
          resize="none"
          css={{ fieldSizing: 'content', minBlockSize: 0, maxBlockSize: 160 }}
          maxLength={200}
          placeholder={labels.descriptionPlaceholder}
          value={values.description}
          disabled={readOnly}
          onChange={(event) => onChange({ description: event.target.value })}
          data-test-subj="automationDescription"
        />
      </EuiFormRow>
    )}
    <EuiSpacer size="l" />
    <AutomationTriggerSection
      trigger={values.trigger}
      dailyDispatchLimit={values.dailyDispatchLimit}
      onTriggerChange={(trigger) => onChange({ trigger })}
      onDailyDispatchLimitChange={(dailyDispatchLimit) => onChange({ dailyDispatchLimit })}
      readOnly={readOnly}
    />
    <EuiSpacer size="l" />
    <AutomationInstructions
      instructions={values.instructions}
      mode={values.mode}
      onInstructionsChange={(instructions) => onChange({ instructions })}
      onModeChange={(mode) => onChange({ mode })}
      readOnly={readOnly}
    />
    <EuiSpacer size="l" />
    <AutomationActionsSection
      slackAction={values.slackAction}
      onSlackActionChange={(slackAction) => onChange({ slackAction })}
      readOnly={readOnly}
    />
  </>
);
