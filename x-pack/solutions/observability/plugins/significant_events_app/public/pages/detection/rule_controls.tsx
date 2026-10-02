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
  EuiFieldText,
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
import type { StreamQuery } from '@kbn/significant-events-schema';
import { SEVERITY_OPTIONS, getSeverityLabel } from '@kbn/significant-events-schema';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useBlocksNewActivity } from '../../hooks/use_significant_events_maintenance';
import { journey } from './journey_translations';

export const RuleControls = ({
  query,
  streamName,
  onSaved,
}: {
  query: StreamQuery;
  streamName?: string;
  onSaved?: () => void;
}): React.ReactElement | null => {
  const { core, dependencies } = useKibana();
  const cache = useQueryClient();
  const { blocksActivity } = useBlocksNewActivity();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(query.title);
  const [description, setDescription] = useState(query.description);
  const [esql, setEsql] = useState(query.esql.query);
  const [severity, setSeverity] = useState(query.severity_score ?? 40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useGeneratedHtmlId({ prefix: 'editDetectionRule' });
  const editLabel = i18n.translate('xpack.significantEventsApp.rule.edit', {
    defaultMessage: 'Tune rule',
  });
  if (!getNightshiftCapabilities(core.application.capabilities.nightshift).canManage) return null;
  const save = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await dependencies.start.significantEvents.significantEventsRepositoryClient.fetch(
        'PUT /internal/significant_events/queries/{queryId}',
        {
          signal: null,
          params: {
            path: { queryId: query.id },
            body: {
              title,
              description,
              esql: { ...query.esql, query: esql },
              severity_score: severity,
              evidence: query.evidence,
              expires_at: query.expires_at,
              target_name: streamName,
            },
          },
        }
      );
      await cache.invalidateQueries();
      setOpen(false);
      onSaved?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <EuiButtonEmpty
        data-test-subj="significantEventsAppRuleControlsButton"
        size="s"
        iconType="controls"
        isDisabled={blocksActivity}
        onClick={() => setOpen(true)}
      >
        {editLabel}
      </EuiButtonEmpty>
      {open && (
        <EuiModal onClose={() => setOpen(false)} aria-labelledby={id}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={id}>{editLabel}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.significantEventsApp.rule.editImpact', {
                  defaultMessage:
                    'Saving updates the stored rule and its future evaluations. Previous detections and events retain their evidence.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow label={journey.title}>
              <EuiFieldText
                data-test-subj="significantEventsAppRuleControlsFieldText"
                value={title}
                maxLength={1000}
                onChange={(event) => setTitle(event.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label={journey.description}>
              <EuiTextArea
                data-test-subj="significantEventsAppRuleControlsTextArea"
                value={description}
                maxLength={10000}
                onChange={(event) => setDescription(event.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.significantEventsApp.rule.severity', {
                defaultMessage: 'Rule severity',
              })}
            >
              <EuiSelect
                data-test-subj="significantEventsAppRuleControlsSelect"
                value={String(severity)}
                onChange={(event) => setSeverity(Number(event.target.value))}
                options={SEVERITY_OPTIONS.map((value) => ({
                  value: String(parseInt(value, 10)),
                  text: getSeverityLabel(value),
                }))}
              />
            </EuiFormRow>
            <EuiFormRow label={journey.streamQuery}>
              <EuiTextArea
                data-test-subj="significantEventsAppRuleControlsTextArea"
                value={esql}
                rows={10}
                maxLength={65535}
                onChange={(event) => setEsql(event.target.value)}
              />
            </EuiFormRow>
            {error && <EuiCallOut announceOnMount title={error} color="danger" />}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppRuleControlsButton"
              onClick={() => setOpen(false)}
            >
              {journey.cancel}
            </EuiButtonEmpty>
            <EuiButton
              data-test-subj="significantEventsAppRuleControlsButton"
              fill
              isLoading={busy}
              isDisabled={!title.trim() || !esql.trim()}
              onClick={save}
            >
              {journey.save}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
