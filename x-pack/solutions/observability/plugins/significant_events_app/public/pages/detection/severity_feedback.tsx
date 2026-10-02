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
  EuiCheckbox,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import {
  SEVERITY_OPTIONS,
  getSeverityLabel,
  type SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { journey } from './journey_translations';

export const SeverityFeedback = ({
  event,
}: {
  event: SignificantEventResponse;
}): React.ReactElement | null => {
  const { core, dependencies } = useKibana();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState(event.severity);
  const [reason, setReason] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useGeneratedHtmlId({ prefix: 'eventSeverityFeedback' });
  const label = i18n.translate('xpack.significantEventsApp.feedback.correctSeverity', {
    defaultMessage: 'Correct severity',
  });
  if (!getNightshiftCapabilities(core.application.capabilities.nightshift).canManage) return null;
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      await dependencies.start.significantEvents.significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/events/{id}/calibrate',
        {
          signal: null,
          params: { path: { id: event.event_id }, body: { severity, reason, remember } },
        }
      );
      await cache.invalidateQueries({ queryKey: ['significantEventLifecycle', event.event_id] });
      await cache.invalidateQueries({ queryKey: ['detectionWorkspace'] });
      await cache.invalidateQueries({ queryKey: ['detectionEngineSettings'] });
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <EuiButtonEmpty
        data-test-subj="significantEventsAppSeverityFeedbackButton"
        size="xs"
        iconType="pencil"
        onClick={() => {
          setSeverity(event.severity);
          setOpen(true);
        }}
      >
        {label}
      </EuiButtonEmpty>
      {open && (
        <EuiModal onClose={() => setOpen(false)} aria-labelledby={id}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={id}>{label}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>{event.title}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow label={label}>
              <EuiSelect
                data-test-subj="significantEventsAppSeverityFeedbackSelect"
                value={severity}
                onChange={(e) => {
                  const selected = SEVERITY_OPTIONS.find((value) => value === e.target.value);
                  if (selected) setSeverity(selected);
                }}
                options={SEVERITY_OPTIONS.map((value) => ({
                  value,
                  text: getSeverityLabel(value),
                }))}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.significantEventsApp.feedback.reason', {
                defaultMessage: 'What should Nightshift understand?',
              })}
            >
              <EuiTextArea
                data-test-subj="significantEventsAppSeverityFeedbackTextArea"
                value={reason}
                maxLength={1000}
                rows={4}
                onChange={(e) => setReason(e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiCheckbox
              id={`${id}-remember`}
              checked={remember}
              disabled={!event.signals?.length}
              onChange={(e) => setRemember(e.target.checked)}
              label={i18n.translate('xpack.significantEventsApp.feedback.remember', {
                defaultMessage: 'Apply to future events with the same streams and rule evidence',
              })}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.significantEventsApp.feedback.scope', {
                  defaultMessage:
                    'The correction is recorded in this event’s history. Remembered feedback is scoped to this exact rule set and can be removed in Detection settings.',
                })}
              </p>
            </EuiText>
            {error && <EuiCallOut announceOnMount title={error} color="danger" />}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppSeverityFeedbackButton"
              onClick={() => setOpen(false)}
            >
              {journey.cancel}
            </EuiButtonEmpty>
            <EuiButton
              data-test-subj="significantEventsAppSeverityFeedbackButton"
              fill
              onClick={save}
              isLoading={busy}
              isDisabled={!reason.trim()}
            >
              {journey.save}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
