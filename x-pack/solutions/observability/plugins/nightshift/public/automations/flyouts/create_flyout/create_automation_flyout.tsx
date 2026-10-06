/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation } from '../../hooks/use_automations';
import {
  createAutomationFormValues,
  type AutomationFormValues,
} from '../form/automation_form_values';
import { AutomationActionsSection } from '../form/actions/automation_actions_section';
import { AutomationInstructions } from '../form/instructions/automation_instructions';
import { AutomationTriggerSection } from '../form/triggers/trigger_section';
import { AutomationTagsField, tagLabels } from '../form/tags_field';
import { AutomationFlyoutFooter } from './automation_flyout_footer';
import { toAutomationRequestBody } from '../form/to_automation_request';
import { canSaveAutomation, getSaveBlocker, isTriggerValid } from '../form/validation';

const labels = {
  untitled: i18n.translate('xpack.nightshift.automations.flyout.untitled', {
    defaultMessage: 'Untitled automation',
  }),
  createTitle: i18n.translate('xpack.nightshift.automations.flyout.createTitle', {
    defaultMessage: 'Create automation',
  }),
  name: i18n.translate('xpack.nightshift.automations.flyout.nameLabel', {
    defaultMessage: 'Name',
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
  discardTitle: i18n.translate('xpack.nightshift.automations.flyout.discardTitle', {
    defaultMessage: 'Discard this automation?',
  }),
  keepEditing: i18n.translate('xpack.nightshift.automations.flyout.keepEditing', {
    defaultMessage: 'Keep editing',
  }),
  discard: i18n.translate('xpack.nightshift.automations.flyout.discard', {
    defaultMessage: 'Discard',
  }),
};

const getDiscardBody = (name: string) =>
  i18n.translate('xpack.nightshift.automations.flyout.discardBody', {
    defaultMessage: '{name} has not been saved. If you leave now, this draft will be discarded.',
    values: { name },
  });

export const CreateAutomationFlyout = ({
  onClose,
  tagSuggestions = [],
}: {
  onClose: () => void;
  tagSuggestions?: string[];
}): React.ReactElement => {
  const [initialValues] = useState(createAutomationFormValues);
  const [values, setValues] = useState(initialValues);
  const [isNameInvalid, setIsNameInvalid] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const titleId = useGeneratedHtmlId();
  const createAutomation = useCreateAutomation();
  const update = (changes: Partial<AutomationFormValues>) =>
    setValues((current) => ({ ...current, ...changes }));
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const saveBlocker = getSaveBlocker(values);
  const canSave = canSaveAutomation(values);

  const requestClose = () => (isDirty ? setIsDiscardOpen(true) : onClose());

  const save = () => {
    const { trigger } = values;
    if (!isTriggerValid(trigger)) return;
    if (!values.name.trim()) {
      setIsNameInvalid(true);
      return;
    }
    createAutomation.mutate(toAutomationRequestBody({ ...values, trigger }), {
      onSuccess: onClose,
    });
  };

  return (
    <EuiFlyoutResizable
      onClose={requestClose}
      size={780}
      minWidth={420}
      maxWidth={960}
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{labels.createTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow fullWidth label={labels.name} isInvalid={isNameInvalid}>
          <EuiFieldText
            fullWidth
            compressed
            placeholder={labels.namePlaceholder}
            value={values.name}
            isInvalid={isNameInvalid}
            onChange={(event) => {
              update({ name: event.target.value });
              setIsNameInvalid(false);
            }}
            data-test-subj="automationName"
          />
        </EuiFormRow>
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
            onChange={(tags) => update({ tags })}
          />
        </EuiFormRow>
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
            onChange={(event) => update({ description: event.target.value })}
            data-test-subj="automationDescription"
          />
        </EuiFormRow>
        <EuiSpacer size="l" />
        <AutomationTriggerSection
          trigger={values.trigger}
          dailyDispatchLimit={values.dailyDispatchLimit}
          onTriggerChange={(trigger) => update({ trigger })}
          onDailyDispatchLimitChange={(dailyDispatchLimit) => update({ dailyDispatchLimit })}
        />
        <EuiSpacer size="l" />
        <AutomationInstructions
          instructions={values.instructions}
          mode={values.mode}
          onInstructionsChange={(instructions) => update({ instructions })}
          onModeChange={(mode) => update({ mode })}
        />
        <EuiSpacer size="l" />
        <AutomationActionsSection
          slackAction={values.slackAction}
          onSlackActionChange={(slackAction) => update({ slackAction })}
        />
      </EuiFlyoutBody>
      <AutomationFlyoutFooter
        isEnabled={values.isEnabled}
        canSave={canSave}
        isSaving={createAutomation.isLoading}
        saveBlocker={saveBlocker}
        onEnabledChange={(isEnabled) => update({ isEnabled })}
        onSave={save}
      />
      {isDiscardOpen && (
        <EuiConfirmModal
          aria-label={labels.discardTitle}
          title={labels.discardTitle}
          onCancel={() => setIsDiscardOpen(false)}
          onConfirm={onClose}
          cancelButtonText={labels.keepEditing}
          confirmButtonText={labels.discard}
          buttonColor="danger"
          data-test-subj="automationDiscardModal"
        >
          <p>{getDiscardBody(values.name || labels.untitled)}</p>
        </EuiConfirmModal>
      )}
    </EuiFlyoutResizable>
  );
};
