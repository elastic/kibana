/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useCreateAutomation } from '../../hooks/use_automations';
import { getInboundWebhookUrl } from '../../utils/webhook_url';
import { getWebhookExamplePayload } from '../../utils/webhook_example';
import { WebhookCredentialsModal } from './webhook_credentials_modal';
import {
  createAutomationFormValues,
  type AutomationFormValues,
} from '../form/automation_form_values';
import { AutomationFormBody } from '../form/automation_form_body';
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
  onCreated,
  tagSuggestions = [],
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  tagSuggestions?: string[];
}): React.ReactElement => {
  const [initialValues] = useState(createAutomationFormValues);
  const [values, setValues] = useState(initialValues);
  const [isNameInvalid, setIsNameInvalid] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  // Held until dismissed: the token is only in this response, so leaving would lose it.
  const [createdWebhook, setCreatedWebhook] = useState<
    { id: string; url: string; token: string; payload: string } | undefined
  >();
  const { http } = useKibana().services;
  const titleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const createAutomation = useCreateAutomation();
  const update = (changes: Partial<AutomationFormValues>) =>
    setValues((current) => ({ ...current, ...changes }));
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const saveBlocker = getSaveBlocker(values);
  const canSave = isDirty && canSaveAutomation(values);

  const requestClose = () => (isDirty ? setIsDiscardOpen(true) : onClose());

  const save = (isEnabled: boolean) => {
    const { trigger } = values;
    if (!isTriggerValid(trigger)) return;
    if (!values.name.trim()) {
      setIsNameInvalid(true);
      return;
    }
    createAutomation.mutate(toAutomationRequestBody({ ...values, isEnabled, trigger }), {
      onSuccess: ({ id, webhook }) => {
        if (webhook) {
          setCreatedWebhook({
            id,
            url: getInboundWebhookUrl(http, webhook.connectorId),
            token: webhook.ingestToken,
            payload: getWebhookExamplePayload(
              trigger.kind === 'webhook' ? trigger.mode : 'generic'
            ),
          });
        } else {
          onCreated(id);
        }
      },
    });
  };

  return (
    <EuiFlyoutResizable
      onClose={requestClose}
      size={780}
      minWidth={420}
      maxWidth={960}
      paddingSize="m"
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" css={{ paddingBlock: euiTheme.size.s }}>
          <h2 id={titleId}>{labels.createTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AutomationFormBody
          values={values}
          tagSuggestions={tagSuggestions}
          isNameInvalid={isNameInvalid}
          onChange={(changes) => {
            update(changes);
            if ('name' in changes) setIsNameInvalid(false);
          }}
        />
      </EuiFlyoutBody>
      <AutomationFlyoutFooter
        canSave={canSave}
        isSaving={createAutomation.isLoading}
        saveBlocker={saveBlocker}
        onSave={save}
      />
      {createdWebhook && (
        <WebhookCredentialsModal
          url={createdWebhook.url}
          token={createdWebhook.token}
          payload={createdWebhook.payload}
          onClose={() => onCreated(createdWebhook.id)}
        />
      )}
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
