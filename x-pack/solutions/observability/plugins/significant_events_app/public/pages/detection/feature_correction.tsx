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
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQueryClient } from '@kbn/react-query';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { journey } from './journey_translations';

export const FeatureCorrection = ({
  feature,
  onSaved,
}: {
  feature: Feature;
  onSaved?: () => void;
}): React.ReactElement | null => {
  const {
    core,
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient: repository },
      },
    },
  } = useKibana();
  const cache = useQueryClient();
  const titleId = useGeneratedHtmlId({ prefix: 'correctKnowledge' });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(feature.title ?? '');
  const [description, setDescription] = useState(feature.description);
  const [properties, setProperties] = useState(feature.properties);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (
    !getNightshiftCapabilities(core.application.capabilities.nightshift).canManage ||
    isComputedFeature(feature)
  )
    return null;
  const save = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      await repository.fetch('POST /internal/streams/{name}/features', {
        signal: null,
        params: {
          path: { name: feature.stream_name },
          body: {
            id: feature.id,
            type: feature.type,
            subtype: feature.subtype,
            title,
            description,
            properties,
            confidence: feature.confidence,
            evidence: feature.evidence,
            evidence_doc_ids: feature.evidence_doc_ids,
            tags: feature.tags,
            filter: feature.filter,
            meta: feature.meta,
            expires_at: feature.expires_at,
          },
        },
      });
      await cache.invalidateQueries();
      core.notifications.toasts.addSuccess(journey.save);
      setOpen(false);
      onSaved?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <EuiButtonEmpty
        data-test-subj="significantEventsAppFeatureCorrectionButton"
        size="xs"
        iconType="pencil"
        onClick={() => setOpen(true)}
      >
        {journey.correct}
      </EuiButtonEmpty>
      {open && (
        <EuiModal
          aria-labelledby={titleId}
          onClose={() => !saving && setOpen(false)}
          maxWidth={620}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={titleId}>
              <h2>{journey.correct}</h2>
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>{journey.correctionImpact}</p>
            </EuiText>
            <EuiSpacer size="m" />
            {error && (
              <>
                <EuiCallOut announceOnMount color="danger" size="s" title={error} />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiFormRow label={journey.title} fullWidth>
              <EuiFieldText
                data-test-subj="significantEventsAppFeatureCorrectionFieldText"
                fullWidth
                value={title}
                maxLength={1000}
                onChange={(event) => setTitle(event.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label={journey.description} fullWidth>
              <EuiTextArea
                data-test-subj="significantEventsAppFeatureCorrectionTextArea"
                fullWidth
                value={description}
                maxLength={10000}
                onChange={(event) => setDescription(event.target.value)}
              />
            </EuiFormRow>
            {Object.entries(properties)
              .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
              .map(([key, value]) => (
                <EuiFormRow key={key} label={key.replace(/_/g, ' ')} fullWidth>
                  <EuiFieldText
                    data-test-subj="significantEventsAppFeatureCorrectionFieldText"
                    fullWidth
                    value={value}
                    maxLength={2000}
                    onChange={(event) =>
                      setProperties((previous) => ({ ...previous, [key]: event.target.value }))
                    }
                  />
                </EuiFormRow>
              ))}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppFeatureCorrectionButton"
              onClick={() => setOpen(false)}
              isDisabled={saving}
            >
              {journey.cancel}
            </EuiButtonEmpty>
            <EuiButton
              data-test-subj="significantEventsAppFeatureCorrectionButton"
              fill
              onClick={save}
              isLoading={saving}
              isDisabled={!description.trim()}
            >
              {journey.save}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
