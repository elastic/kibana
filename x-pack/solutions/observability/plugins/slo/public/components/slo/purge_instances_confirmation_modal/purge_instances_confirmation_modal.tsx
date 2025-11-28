/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../../common/constants';
import { usePurgeInstances } from '../../../pages/slo_management/hooks/use_purge_instances';
import { useGetSettings } from '../../../pages/slo_settings/hooks/use_get_settings';

interface Props {
  items?: SLODefinitionResponse[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function PurgeInstancesConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutate: purgeInstances } = usePurgeInstances({ onConfirm });
  const { data: settings, isLoading } = useGetSettings();

  const modalTitleId = useGeneratedHtmlId();
  const checkboxId = useGeneratedHtmlId();

  const [override, setOverride] = useState<boolean>(false);
  const [staleDuration, setStaleDuration] = useState<number>(DEFAULT_STALE_SLO_THRESHOLD_HOURS);

  useEffect(() => {
    if (!isLoading && settings?.staleThresholdInHours) {
      setStaleDuration(settings.staleThresholdInHours);
    }
  }, [isLoading, settings?.staleThresholdInHours]);

  const requireOverride =
    staleDuration < (settings?.staleThresholdInHours ?? DEFAULT_STALE_SLO_THRESHOLD_HOURS);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      confirmButtonDisabled={(requireOverride && !override) || staleDuration <= 0}
      data-test-subj="purgeInstancesConfirmationModal"
      title={i18n.translate('xpack.slo.purgeInstancesConfirmationModal.title', {
        defaultMessage: 'Purge stale instances?',
      })}
      cancelButtonText={i18n.translate(
        'xpack.slo.purgeInstancesConfirmationModal.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.slo.purgeInstancesConfirmationModal.disableButtonLabel',
        { defaultMessage: 'Purge' }
      )}
      onCancel={onCancel}
      onConfirm={() => {
        purgeInstances({
          list: items?.map((item) => item.id) || [],
          staleDuration: `${staleDuration}h`,
          force: override,
        });
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiText>
          {i18n.translate('xpack.slo.purgeInstancesConfirmationModal.descriptionText', {
            defaultMessage:
              'This action will permanently delete all stale SLO instances as defined in your settings. You can override the stale duration threshold below.',
          })}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate(
            'xpack.slo.purgeInstancesConfirmationModal.euiFormRow.staleDurationLabel',
            { defaultMessage: 'Stale duration' }
          )}
          helpText="In hours"
        >
          <EuiFieldNumber
            data-test-subj="sloPurgeInstancesConfirmationModalFieldNumber"
            min={1}
            step={1}
            defaultValue={DEFAULT_STALE_SLO_THRESHOLD_HOURS}
            value={String(staleDuration)}
            onChange={(e) => setStaleDuration(Number(e.target.value))}
            aria-label={i18n.translate(
              'xpack.slo.purgeInstancesConfirmationModal.euiFieldNumber.staleDurationInHoursLabel',
              { defaultMessage: 'Stale duration in hours' }
            )}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiCheckbox
            id={checkboxId}
            checked={override}
            disabled={!requireOverride}
            onChange={(e) => {
              setOverride(e.target.checked);
            }}
            label={i18n.translate('xpack.slo.purgeInstancesConfirmationModal.forcePurge', {
              defaultMessage: 'Override stale threshold settings',
            })}
          />
        </EuiFormRow>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
}
