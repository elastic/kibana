/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import type { ServiceTier, ServiceUserMetadata } from '../../common/service_metadata';
import { useServiceMetadata, useSaveServiceMetadata } from '../hooks/use_service_metadata';

const TIER_OPTIONS: Array<{ value: ServiceTier | ''; text: string }> = [
  {
    value: '',
    text: i18n.translate('xpack.entitiesCaue.metadata.tier.none', { defaultMessage: '— none —' }),
  },
  {
    value: 'critical',
    text: i18n.translate('xpack.entitiesCaue.metadata.tier.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    value: 'standard',
    text: i18n.translate('xpack.entitiesCaue.metadata.tier.standard', {
      defaultMessage: 'Standard',
    }),
  },
  {
    value: 'internal',
    text: i18n.translate('xpack.entitiesCaue.metadata.tier.internal', {
      defaultMessage: 'Internal',
    }),
  },
];

interface Props {
  http: HttpStart;
  entityId: string;
  serviceName: string;
  onClose: () => void;
}

export const ServiceMetadataFlyout = ({ http, entityId, serviceName, onClose }: Props) => {
  const { data: saved, isLoading } = useServiceMetadata(http, entityId);
  const saveMutation = useSaveServiceMetadata(http, entityId);

  const [owner, setOwner] = useState('');
  const [tier, setTier] = useState<ServiceTier | ''>('');
  const [runbookUrl, setRunbookUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Populate form once existing metadata is loaded
  useEffect(() => {
    if (saved) {
      setOwner(saved.owner ?? '');
      setTier(saved.tier ?? '');
      setRunbookUrl(saved.runbook_url ?? '');
      setNotes(saved.notes ?? '');
    }
  }, [saved]);

  const handleSave = () => {
    const metadata: ServiceUserMetadata = {
      ...(owner ? { owner } : {}),
      ...(tier ? { tier } : {}),
      ...(runbookUrl ? { runbook_url: runbookUrl } : {}),
      ...(notes ? { notes } : {}),
    };
    saveMutation.mutate(metadata, { onSuccess: onClose });
  };

  return (
    <EuiFlyout onClose={onClose} size="s" aria-labelledby="service-metadata-flyout-title">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="service-metadata-flyout-title">
            {i18n.translate('xpack.entitiesCaue.metadata.flyout.title', {
              defaultMessage: 'Edit metadata — {name}',
              values: { name: serviceName },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <EuiForm>
            <EuiFormRow
              label={i18n.translate('xpack.entitiesCaue.metadata.owner', {
                defaultMessage: 'Owner',
              })}
              helpText={i18n.translate('xpack.entitiesCaue.metadata.owner.help', {
                defaultMessage: 'Team or person responsible for this service.',
              })}
            >
              <EuiFieldText
                data-test-subj="entitiesCaueServiceMetadataFlyoutFieldText"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                maxLength={200}
                placeholder="e.g. platform-team"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.entitiesCaue.metadata.tier', { defaultMessage: 'Tier' })}
            >
              <EuiSelect
                data-test-subj="entitiesCaueServiceMetadataFlyoutSelect"
                options={TIER_OPTIONS}
                value={tier}
                onChange={(e) => setTier(e.target.value as ServiceTier | '')}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.entitiesCaue.metadata.runbook', {
                defaultMessage: 'Runbook URL',
              })}
            >
              <EuiFieldText
                data-test-subj="entitiesCaueServiceMetadataFlyoutFieldText"
                value={runbookUrl}
                onChange={(e) => setRunbookUrl(e.target.value)}
                maxLength={500}
                placeholder="https://wiki.example.com/runbook"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.entitiesCaue.metadata.notes', {
                defaultMessage: 'Notes',
              })}
            >
              <EuiTextArea
                data-test-subj="entitiesCaueServiceMetadataFlyoutTextArea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </EuiFormRow>
          </EuiForm>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="entitiesCaueServiceMetadataFlyoutCancelButton"
              onClick={onClose}
            >
              {i18n.translate('xpack.entitiesCaue.metadata.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entitiesCaueServiceMetadataFlyoutSaveButton"
              fill
              onClick={handleSave}
              isLoading={saveMutation.isLoading}
              isDisabled={isLoading}
            >
              {i18n.translate('xpack.entitiesCaue.metadata.save', { defaultMessage: 'Save' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
