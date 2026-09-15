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
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation } from '../hooks/use_create_automation';

const TRIGGER_OPTIONS = [
  {
    value: 'significant_event',
    text: i18n.translate('xpack.nightshift.automations.triggerOption.significantEvent', {
      defaultMessage: 'Significant event',
    }),
  },
  {
    value: 'alert',
    text: i18n.translate('xpack.nightshift.automations.triggerOption.alert', {
      defaultMessage: 'Alert',
    }),
  },
];

export function CreateAutomationFlyout({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerKind, setTriggerKind] = useState<'significant_event' | 'alert'>(
    'significant_event'
  );
  const [dailyLimit, setDailyLimit] = useState(20);
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: createAutomation, isLoading, error: mutationError } = useCreateAutomation();

  const nameIsValid = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!nameIsValid) return;

    await createAutomation({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: { rows: [{ kind: triggerKind }] },
      execution: {},
      completion: {},
      runtime: { dailyDispatchLimit: dailyLimit },
    });

    onCreated?.();
    onClose();
  };

  return (
    <EuiFlyout ownFocus size="m" onClose={onClose} data-test-subj="nightshiftCreateAutomationFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.nightshift.automations.createFlyout.title', {
              defaultMessage: 'Create automation',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {mutationError != null && (
          <>
            <EuiCallOut
              color="danger"
              iconType="error"
              title={i18n.translate('xpack.nightshift.automations.createFlyout.errorTitle', {
                defaultMessage: 'Failed to create automation',
              })}
            >
              <p>{mutationError.message}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiForm component="form" onSubmit={handleSubmit} id="createAutomationForm">
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.automations.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={submitted && !nameIsValid}
            error={i18n.translate('xpack.nightshift.automations.createFlyout.nameRequired', {
              defaultMessage: 'Name is required',
            })}
          >
            <EuiFieldText
              value={name}
              onChange={(e) => setName(e.target.value)}
              isInvalid={submitted && !nameIsValid}
              data-test-subj="nightshiftAutomationName"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.nightshift.automations.createFlyout.triggerLabel', {
              defaultMessage: 'Trigger',
            })}
            helpText={
              triggerKind === 'alert'
                ? i18n.translate(
                    'xpack.nightshift.automations.createFlyout.alertTriggerHelp',
                    {
                      defaultMessage:
                        'Alert trigger is stored but not yet wired to the execution engine in this POC.',
                    }
                  )
                : undefined
            }
          >
            <EuiSelect
              options={TRIGGER_OPTIONS}
              value={triggerKind}
              onChange={(e) => {
                if (e.target.value === 'significant_event' || e.target.value === 'alert') {
                  setTriggerKind(e.target.value);
                }
              }}
              data-test-subj="nightshiftAutomationTrigger"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.nightshift.automations.createFlyout.dailyLimitLabel',
              { defaultMessage: 'Daily dispatch limit' }
            )}
            helpText={i18n.translate(
              'xpack.nightshift.automations.createFlyout.dailyLimitHelp',
              { defaultMessage: 'Maximum investigations triggered per day. 0 = unlimited.' }
            )}
          >
            <EuiFieldNumber
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 0)}
              min={0}
              data-test-subj="nightshiftAutomationDailyLimit"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.nightshift.automations.createFlyout.descriptionLabel',
              { defaultMessage: 'Description' }
            )}
            labelAppend={i18n.translate(
              'xpack.nightshift.automations.createFlyout.optionalLabel',
              { defaultMessage: 'Optional' }
            )}
          >
            <EuiTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              data-test-subj="nightshiftAutomationDescription"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isLoading}>
          {i18n.translate('xpack.nightshift.automations.createFlyout.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          form="createAutomationForm"
          isLoading={isLoading}
          data-test-subj="nightshiftCreateAutomationSubmit"
        >
          {i18n.translate('xpack.nightshift.automations.createFlyout.createButton', {
            defaultMessage: 'Create',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
