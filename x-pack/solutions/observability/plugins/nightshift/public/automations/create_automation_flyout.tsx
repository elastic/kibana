/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation } from '../hooks/use_automations';

interface TriggerRow {
  ruleNamePattern: string;
  alertStatus: 'active' | 'inactive' | 'any';
  tags: string[];
}

const initialTrigger = (): TriggerRow => ({ ruleNamePattern: '', alertStatus: 'any', tags: [] });

const labels = {
  title: i18n.translate('xpack.nightshift.automations.createTitle', {
    defaultMessage: 'Create automation',
  }),
  name: i18n.translate('xpack.nightshift.automations.nameLabel', { defaultMessage: 'Name' }),
  description: i18n.translate('xpack.nightshift.automations.descriptionLabel', {
    defaultMessage: 'Description',
  }),
  descriptionPlaceholder: i18n.translate('xpack.nightshift.automations.descriptionPlaceholder', {
    defaultMessage: 'What does this automation do?',
  }),
  triggers: i18n.translate('xpack.nightshift.automations.triggersLabel', {
    defaultMessage: 'Triggers',
  }),
  triggerType: i18n.translate('xpack.nightshift.automations.triggerTypeLabel', {
    defaultMessage: 'Trigger type',
  }),
  alert: i18n.translate('xpack.nightshift.automations.alertLabel', { defaultMessage: 'Alert' }),
  ruleName: i18n.translate('xpack.nightshift.automations.ruleNamePatternLabel', {
    defaultMessage: 'Rule name pattern',
  }),
  ruleNameHelp: i18n.translate('xpack.nightshift.automations.ruleNamePatternHelp', {
    defaultMessage: 'Matches rule names that contain this text.',
  }),
  alertStatus: i18n.translate('xpack.nightshift.automations.alertStatusLabel', {
    defaultMessage: 'Alert status',
  }),
  anyStatus: i18n.translate('xpack.nightshift.automations.anyStatusOption', {
    defaultMessage: 'Any status',
  }),
  active: i18n.translate('xpack.nightshift.automations.activeOption', { defaultMessage: 'Active' }),
  recovered: i18n.translate('xpack.nightshift.automations.recoveredOption', {
    defaultMessage: 'Recovered',
  }),
  tags: i18n.translate('xpack.nightshift.automations.tagsLabel', { defaultMessage: 'Tags' }),
  addTrigger: i18n.translate('xpack.nightshift.automations.addTriggerButton', {
    defaultMessage: 'Add trigger',
  }),
  removeTrigger: i18n.translate('xpack.nightshift.automations.removeTriggerButton', {
    defaultMessage: 'Remove trigger',
  }),
  dailyLimit: i18n.translate('xpack.nightshift.automations.dailyLimitLabel', {
    defaultMessage: 'Daily trigger limit',
  }),
  dailyLimitHelp: i18n.translate('xpack.nightshift.automations.dailyLimitHelp', {
    defaultMessage: 'When reached, additional triggers are skipped.',
  }),
  perDay: i18n.translate('xpack.nightshift.automations.perDayAppend', {
    defaultMessage: 'per day',
  }),
  cancel: i18n.translate('xpack.nightshift.automations.cancelButton', { defaultMessage: 'Cancel' }),
};

export const CreateAutomationFlyout = ({
  onClose,
}: {
  onClose: () => void;
}): React.ReactElement => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState<TriggerRow[]>([initialTrigger()]);
  const [dailyDispatchLimit, setDailyDispatchLimit] = useState('20');
  const createAutomation = useCreateAutomation();
  const numericDailyDispatchLimit = Number(dailyDispatchLimit);
  const isDailyDispatchLimitValid =
    Number.isInteger(numericDailyDispatchLimit) &&
    numericDailyDispatchLimit >= 1 &&
    numericDailyDispatchLimit <= 200;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    createAutomation.mutate(
      {
        name: trimmedName,
        ...(description.trim() ? { description: description.trim() } : {}),
        trigger: {
          rows: triggers.map(({ ruleNamePattern, alertStatus, tags }) => ({
            kind: 'alert' as const,
            ...(ruleNamePattern.trim() ? { ruleNamePattern: ruleNamePattern.trim() } : {}),
            ...(alertStatus !== 'any' ? { alertStatus } : {}),
            ...(tags.length ? { tags } : {}),
          })),
        },
        execution: {},
        completion: {},
        runtime: { dailyDispatchLimit: numericDailyDispatchLimit },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="createAutomationTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createAutomationTitle">{labels.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm
          id="createAutomationForm"
          component="form"
          onSubmit={submit}
          data-test-subj="createAutomationForm"
        >
          <EuiFormRow label={labels.name}>
            <EuiFieldText
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={500}
              data-test-subj="automationName"
            />
          </EuiFormRow>
          <EuiFormRow label={labels.description}>
            <EuiTextArea
              data-test-subj="nightshiftCreateAutomationFlyoutTextArea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={labels.descriptionPlaceholder}
            />
          </EuiFormRow>
          <EuiFormRow label={labels.triggers}>
            <div>
              {triggers.map((trigger, index) => (
                <div key={index}>
                  <EuiFormRow label={labels.triggerType}>
                    <EuiSelect
                      data-test-subj="nightshiftCreateAutomationFlyoutSelect"
                      options={[{ value: 'alert', text: labels.alert }]}
                      value="alert"
                      onChange={() => {}}
                    />
                  </EuiFormRow>
                  <EuiFormRow label={labels.ruleName} helpText={labels.ruleNameHelp}>
                    <EuiFieldText
                      data-test-subj="nightshiftCreateAutomationFlyoutFieldText"
                      value={trigger.ruleNamePattern}
                      onChange={(event) =>
                        setTriggers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, ruleNamePattern: event.target.value }
                              : row
                          )
                        )
                      }
                    />
                  </EuiFormRow>
                  <EuiFormRow label={labels.alertStatus}>
                    <EuiSelect
                      data-test-subj="nightshiftCreateAutomationFlyoutSelect"
                      options={[
                        { value: 'any', text: labels.anyStatus },
                        { value: 'active', text: labels.active },
                        { value: 'inactive', text: labels.recovered },
                      ]}
                      value={trigger.alertStatus}
                      onChange={(event) =>
                        setTriggers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  alertStatus: event.target.value as TriggerRow['alertStatus'],
                                }
                              : row
                          )
                        )
                      }
                    />
                  </EuiFormRow>
                  <EuiFormRow label={labels.tags}>
                    <EuiComboBox
                      selectedOptions={trigger.tags.map((tag) => ({ label: tag }))}
                      options={[]}
                      onCreateOption={(tag) =>
                        setTriggers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, tags: [...row.tags, tag] } : row
                          )
                        )
                      }
                      onChange={(options) =>
                        setTriggers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, tags: options.map(({ label }) => label) }
                              : row
                          )
                        )
                      }
                    />
                  </EuiFormRow>
                  <EuiButtonEmpty
                    disabled={triggers.length === 1}
                    onClick={() =>
                      setTriggers((current) => current.filter((_, rowIndex) => rowIndex !== index))
                    }
                    data-test-subj={`removeTrigger-${index}`}
                  >
                    {labels.removeTrigger}
                  </EuiButtonEmpty>
                </div>
              ))}
              <EuiButtonEmpty
                onClick={() => setTriggers((current) => [...current, initialTrigger()])}
                data-test-subj="addTrigger"
              >
                {labels.addTrigger}
              </EuiButtonEmpty>
            </div>
          </EuiFormRow>
          <EuiFormRow label={labels.dailyLimit} helpText={labels.dailyLimitHelp}>
            <EuiFieldNumber
              data-test-subj="nightshiftCreateAutomationFlyoutFieldNumber"
              min={1}
              max={200}
              value={dailyDispatchLimit}
              onChange={(event) => setDailyDispatchLimit(event.target.value)}
              append={labels.perDay}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty data-test-subj="nightshiftCreateAutomationFlyoutButton" onClick={onClose}>
          {labels.cancel}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          form="createAutomationForm"
          isLoading={createAutomation.isLoading}
          disabled={!name.trim() || !isDailyDispatchLimitValid}
          data-test-subj="submitAutomation"
        >
          {labels.title}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
