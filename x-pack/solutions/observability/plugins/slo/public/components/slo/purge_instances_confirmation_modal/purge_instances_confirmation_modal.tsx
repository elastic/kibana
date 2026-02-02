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
  EuiI18n,
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

const STALE_SLO_THRESHOLD_LABEL = i18n.translate(
  'xpack.slo.purgeInstancesConfirmationModal.staleSloThresholdLabel',
  { defaultMessage: 'Stale SLOs threshold' }
);

const STALE_THRESHOLD_LABEL = i18n.translate(
  'xpack.slo.purgeInstancesConfirmationModal.staleThresholdLabel',
  { defaultMessage: 'Stale threshold' }
);

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
  const isFormValid =
    Number.isInteger(staleDuration) && staleDuration > 0 && (!requireOverride || override);

  const hasSelectedSlos = items && items.length > 0;

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      confirmButtonDisabled={!isFormValid}
      data-test-subj="purgeInstancesConfirmationModal"
      title={i18n.translate('xpack.slo.purgeInstancesConfirmationModal.title', {
        defaultMessage: 'Purge stale instances',
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
          {hasSelectedSlos ? (
            <EuiI18n
              token="xpack.slo.purgeInstancesConfirmationModal.descriptionTextWithSelection"
              default="Permanently delete all stale instances from the {count} selected SLOs based on the {settingsLabel} setting. Override this setting by updating the following {inputLabel}."
              values={{
                count: items.length,
                settingsLabel: <strong>{STALE_SLO_THRESHOLD_LABEL}</strong>,
                inputLabel: <strong>{STALE_THRESHOLD_LABEL}</strong>,
              }}
            />
          ) : (
            <EuiI18n
              token="xpack.slo.purgeInstancesConfirmationModal.descriptionText"
              default="Permanently delete all stale SLO instances based on the {settingsLabel} setting. Override this setting by updating the following {inputLabel}."
              values={{
                settingsLabel: <strong>{STALE_SLO_THRESHOLD_LABEL}</strong>,
                inputLabel: <strong>{STALE_THRESHOLD_LABEL}</strong>,
              }}
            />
          )}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate(
            'xpack.slo.purgeInstancesConfirmationModal.euiFormRow.staleDurationLabel',
            { defaultMessage: 'Stale threshold' }
          )}
          helpText="In hours"
          isInvalid={!Number.isInteger(staleDuration) || staleDuration <= 0}
        >
          <EuiFieldNumber
            data-test-subj="sloPurgeInstancesConfirmationModalFieldNumber"
            min={1}
            step={1}
            isInvalid={!Number.isInteger(staleDuration) || staleDuration <= 0}
            defaultValue={DEFAULT_STALE_SLO_THRESHOLD_HOURS}
            value={String(staleDuration)}
            onChange={(e) => setStaleDuration(Number(e.target.value))}
            aria-label={i18n.translate(
              'xpack.slo.purgeInstancesConfirmationModal.euiFieldNumber.staleDurationInHoursLabel',
              { defaultMessage: 'Stale threshold in hours' }
            )}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiCheckbox
            id={checkboxId}
            data-test-subj="sloPurgeInstancesConfirmationModalOverrideCheckbox"
            checked={override}
            disabled={!requireOverride}
            onChange={(e) => {
              setOverride(e.target.checked);
            }}
            label={
              <EuiI18n
                token="xpack.slo.purgeInstancesConfirmationModal.forcePurge"
                default="Override the {settingsLabel} setting"
                values={{
                  settingsLabel: <strong>{STALE_SLO_THRESHOLD_LABEL}</strong>,
                }}
              />
            }
          />
        </EuiFormRow>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
}
