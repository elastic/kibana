/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import { SEVERITY_LEVELS, SUBMIT_SUBSCRIPTION_API_PATH, type SeverityLevel } from '../../../common';
import type { SubscriptionConfirmationPayload } from '../../../common/attachment_payloads';

type SubscriptionConfirmationAttachment = Attachment<
  'threat-intel-subscription-confirmation',
  SubscriptionConfirmationPayload
>;

interface FormState {
  tags: string[];
  severity_threshold: SeverityLevel;
  schedule_rrule: string;
  delivery_type: 'email' | 'slack';
  delivery_target: string;
  delivery_connector_id: string;
}

const SCHEDULE_PRESETS: Array<{ value: string; label: string }> = [
  { value: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0', label: 'Daily at 08:00 UTC' },
  { value: 'FREQ=DAILY;BYHOUR=8,16;BYMINUTE=0', label: 'Twice daily (08:00 and 16:00 UTC)' },
  { value: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9', label: 'Weekly on Monday at 09:00 UTC' },
  { value: 'FREQ=WEEKLY;BYDAY=FR;BYHOUR=15', label: 'Weekly on Friday at 15:00 UTC' },
];

const tagsToOptions = (tags: string[]): EuiComboBoxOptionOption<string>[] =>
  tags.map((t) => ({ label: t, value: t }));

const SubscriptionForm: React.FC<{
  initial: SubscriptionConfirmationPayload;
  http: CoreStart['http'];
  attachmentId: string;
}> = ({ initial, http, attachmentId }) => {
  const [form, setForm] = useState<FormState>({
    tags: initial.tags,
    severity_threshold: initial.severity_threshold,
    schedule_rrule: initial.schedule_rrule,
    delivery_type: initial.delivery.type,
    delivery_target: initial.delivery.target,
    delivery_connector_id: initial.delivery.connector_id ?? '',
  });
  const [submitState, setSubmitState] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'submitted'; subscriptionId: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [tagOptions, setTagOptions] = useState<EuiComboBoxOptionOption<string>[]>(
    tagsToOptions(initial.tags)
  );

  const isSubmitted = submitState.kind === 'submitted';
  const isSubmitting = submitState.kind === 'submitting';

  const handleSubmit = useCallback(async () => {
    if (form.tags.length === 0 || !form.delivery_target.trim()) {
      setSubmitState({
        kind: 'error',
        message: i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.validationRequired',
          {
            defaultMessage:
              'At least one tag and a non-empty delivery target are required to submit.',
          }
        ),
      });
      return;
    }
    setSubmitState({ kind: 'submitting' });
    try {
      const connectorId = form.delivery_connector_id.trim();
      const response = (await http.post(SUBMIT_SUBSCRIPTION_API_PATH, {
        version: '1',
        body: JSON.stringify({
          tags: form.tags,
          severity_threshold: form.severity_threshold,
          schedule_rrule: form.schedule_rrule,
          delivery: {
            type: form.delivery_type,
            target: form.delivery_target.trim(),
            ...(connectorId ? { connector_id: connectorId } : {}),
          },
          template_id: initial.template_id,
        }),
      })) as { subscription_id: string };
      setSubmitState({ kind: 'submitted', subscriptionId: response.subscription_id });
    } catch (err) {
      const message =
        (err as { body?: { message?: string }; message?: string }).body?.message ??
        (err as Error).message ??
        i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.submitFailed',
          { defaultMessage: 'Failed to submit subscription.' }
        );
      setSubmitState({ kind: 'error', message });
    }
  }, [form, http, initial.template_id]);

  // Expose submit via a global on the attachment id so the action button
  // handler can call it. Action button handlers are () => void | Promise<void>
  // with no arguments today; bridging through window keeps the renderer
  // self-contained and avoids leaking a ref upward into the AttachmentUIDefinition.
  React.useEffect(() => {
    const key = `__threatIntelSubmitSubscription_${attachmentId}`;
    (window as unknown as Record<string, () => Promise<void>>)[key] = handleSubmit;
    return () => {
      delete (window as unknown as Record<string, () => Promise<void>>)[key];
    };
  }, [attachmentId, handleSubmit]);

  const severityOptions = useMemo(
    () => SEVERITY_LEVELS.map((level) => ({ value: level, text: level })),
    []
  );

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.threatIntelligence.attachments.subscriptionConfirmation.title', {
            defaultMessage: 'Confirm threat intelligence subscription',
          })}
        </h4>
      </EuiTitle>
      {initial.template_id ? (
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.threatIntelligence.attachments.subscriptionConfirmation.templateNote',
            {
              defaultMessage: 'Pre-filled from template "{templateId}". You can edit any field.',
              values: { templateId: initial.template_id },
            }
          )}
        </EuiText>
      ) : null}
      <EuiSpacer size="s" />
      <EuiText size="s">{initial.human_summary}</EuiText>
      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.tagsLabel',
          { defaultMessage: 'Tags' }
        )}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          isDisabled={isSubmitted || isSubmitting}
          noSuggestions
          placeholder={i18n.translate(
            'xpack.threatIntelligence.attachments.subscriptionConfirmation.tagsPlaceholder',
            { defaultMessage: 'Type a tag and press Enter' }
          )}
          selectedOptions={tagsToOptions(form.tags)}
          options={tagOptions}
          onCreateOption={(value) => {
            const trimmed = value.trim();
            if (!trimmed) return;
            setForm((prev) => ({ ...prev, tags: [...new Set([...prev.tags, trimmed])] }));
            setTagOptions((prev) => [...prev, { label: trimmed, value: trimmed }]);
          }}
          onChange={(selected) => {
            setForm((prev) => ({ ...prev, tags: selected.map((s) => s.label) }));
          }}
        />
      </EuiFormRow>

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.severityLabel',
              { defaultMessage: 'Min severity' }
            )}
            fullWidth
          >
            <EuiSelect
              fullWidth
              disabled={isSubmitted || isSubmitting}
              value={form.severity_threshold}
              options={severityOptions}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  severity_threshold: e.target.value as SeverityLevel,
                }))
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.scheduleLabel',
              { defaultMessage: 'Schedule (RRULE)' }
            )}
            fullWidth
          >
            <EuiSelect
              fullWidth
              disabled={isSubmitted || isSubmitting}
              value={
                SCHEDULE_PRESETS.some((p) => p.value === form.schedule_rrule)
                  ? form.schedule_rrule
                  : 'custom'
              }
              options={[
                ...SCHEDULE_PRESETS.map((p) => ({ value: p.value, text: p.label })),
                { value: 'custom', text: form.schedule_rrule || 'Custom RRULE…' },
              ]}
              onChange={(e) => {
                if (e.target.value === 'custom') return;
                setForm((prev) => ({ ...prev, schedule_rrule: e.target.value }));
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFormRow
        label={i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.scheduleRawLabel',
          { defaultMessage: 'Custom RRULE override' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          disabled={isSubmitted || isSubmitting}
          value={form.schedule_rrule}
          onChange={(e) => setForm((prev) => ({ ...prev, schedule_rrule: e.target.value }))}
        />
      </EuiFormRow>

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={1}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.deliveryTypeLabel',
              { defaultMessage: 'Delivery channel' }
            )}
            fullWidth
          >
            <EuiSelect
              fullWidth
              disabled={isSubmitted || isSubmitting}
              value={form.delivery_type}
              options={[
                { value: 'email', text: 'email' },
                { value: 'slack', text: 'slack' },
              ]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  delivery_type: e.target.value as 'email' | 'slack',
                }))
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.deliveryTargetLabel',
              { defaultMessage: 'Delivery target' }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              disabled={isSubmitted || isSubmitting}
              value={form.delivery_target}
              placeholder={
                form.delivery_type === 'email' ? 'ciso-digest@corp.com' : '#security-ops'
              }
              onChange={(e) => setForm((prev) => ({ ...prev, delivery_target: e.target.value }))}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFormRow
        label={i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.deliveryConnectorLabel',
          { defaultMessage: 'Delivery connector id (optional)' }
        )}
        helpText={i18n.translate(
          'xpack.threatIntelligence.attachments.subscriptionConfirmation.deliveryConnectorHelp',
          {
            defaultMessage:
              'Configured Kibana actions connector to dispatch through (.email or .slack). Leave blank to let the digest workflow pick the first matching connector for the chosen channel.',
          }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          disabled={isSubmitted || isSubmitting}
          value={form.delivery_connector_id}
          placeholder={i18n.translate(
            'xpack.threatIntelligence.attachments.subscriptionConfirmation.deliveryConnectorPlaceholder',
            { defaultMessage: 'e.g. preconfigured-email-connector' }
          )}
          onChange={(e) => setForm((prev) => ({ ...prev, delivery_connector_id: e.target.value }))}
        />
      </EuiFormRow>

      {submitState.kind === 'error' ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="alert"
            size="s"
            title={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.errorTitle',
              { defaultMessage: 'Submission failed' }
            )}
          >
            {submitState.message}
          </EuiCallOut>
        </>
      ) : null}

      {submitState.kind === 'submitted' ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="success"
            iconType="check"
            size="s"
            title={i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.submittedTitle',
              { defaultMessage: 'Subscription created' }
            )}
          >
            {i18n.translate(
              'xpack.threatIntelligence.attachments.subscriptionConfirmation.submittedBody',
              {
                defaultMessage: 'Subscription id: {id}',
                values: { id: submitState.subscriptionId },
              }
            )}
          </EuiCallOut>
        </>
      ) : null}
    </EuiPanel>
  );
};

/**
 * Editable subscription-confirmation card. Replaces the previous Phase A
 * read-only fallback. The Submit action button posts directly to
 * `/internal/threat_intelligence/subscriptions/submit`, bypassing a second
 * agent round-trip — no platform `interactive_form` primitive required.
 */
export const buildSubscriptionConfirmationUiDefinition = (
  http: CoreStart['http']
): AttachmentUIDefinition<SubscriptionConfirmationAttachment> => ({
  getLabel: (attachment) =>
    attachment.data?.attachmentLabel ??
    i18n.translate('xpack.threatIntelligence.attachments.subscriptionConfirmation.label', {
      defaultMessage: 'Confirm subscription',
    }),
  getIcon: () => 'email',
  renderInlineContent: ({ attachment }) => (
    <SubscriptionForm initial={attachment.data} http={http} attachmentId={attachment.id} />
  ),
  getActionButtons: ({ attachment }) => [
    {
      label: i18n.translate(
        'xpack.threatIntelligence.attachments.subscriptionConfirmation.subscribeAction',
        { defaultMessage: 'Submit' }
      ),
      type: ActionButtonType.PRIMARY,
      icon: 'check',
      handler: async () => {
        const key = `__threatIntelSubmitSubscription_${attachment.id}`;
        const submit = (window as unknown as Record<string, (() => Promise<void>) | undefined>)[
          key
        ];
        if (typeof submit === 'function') {
          await submit();
        }
      },
    },
    {
      label: i18n.translate(
        'xpack.threatIntelligence.attachments.subscriptionConfirmation.cancelAction',
        { defaultMessage: 'Cancel' }
      ),
      type: ActionButtonType.SECONDARY,
      icon: 'cross',
      handler: () => {
        // Cancellation is local-only — there is nothing persisted to roll back.
      },
    },
  ],
});
