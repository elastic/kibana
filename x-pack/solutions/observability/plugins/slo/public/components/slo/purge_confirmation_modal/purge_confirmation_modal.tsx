/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiCheckbox,
  EuiConfirmModal,
  EuiDatePicker,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import moment, { Moment } from 'moment';
import { useBulkPurgeRollupData } from '../../../pages/slo_management/hooks/use_bulk_purge_rollup_data';

export interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  items: SLODefinitionResponse[];
  single: boolean;
}

export function SloPurgeConfirmationModal({ items, single, onCancel, onConfirm }: Props) {
  const { mutate: bulkPurge } = useBulkPurgeRollupData({ onConfirm });

  const [purgeDate, setPurgeDate] = React.useState<Moment | null>(moment());
  const [purgeType, setPurgeType] = React.useState<string>('fixed_age');
  const [forcePurge, setForgePurge] = React.useState<boolean>(false);
  const [age, setAge] = React.useState('7d');

  const basicCheckboxId = useGeneratedHtmlId({ prefix: 'basicCheckbox' });

  const purgeTimeLabel = i18n.translate('xpack.slo.purgeConfirmationModal.purgeDataDescription', {
    defaultMessage: 'Purge data older than',
  });

  const MODAL_TITLE = single
    ? i18n.translate('xpack.slo.purgeConfirmationModal.title', {
        defaultMessage: 'Purge {name}',
        values: { name: items[0].name },
      })
    : i18n.translate('xpack.slo.purgeConfirmationModal.title', {
        defaultMessage: 'Purge {count} SLOs',
        values: { count: items.length },
      });

  const PURGE_POLICY_HELP_TEXT = single
    ? i18n.translate('xpack.slo.purgeConfirmationModal.descriptionText', {
        defaultMessage:
          'Rollup data for {count} SLOs will be purged according to the policy provided below.',
        values: { count: items.length },
      })
    : i18n.translate('xpack.slo.purgeConfirmationModal.descriptionText', {
        defaultMessage:
          'Rollup data for {name} will be purged according to the policy provided below.',
        values: { name: items[0].name },
      });

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloPurgeConfirmationModal"
      title={MODAL_TITLE}
      cancelButtonText={i18n.translate('xpack.slo.purgeConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.purgeConfirmationModal.confirmButtonLabel', {
        defaultMessage: 'Purge',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        bulkPurge({
          list: items.map(({ id }) => id),
          purgePolicy:
            purgeType === 'fixed_age'
              ? {
                  purgeType: 'fixed_age',
                  age,
                }
              : {
                  purgeType: 'fixed_time',
                  timestamp: purgeDate!.toISOString(),
                },
          force: forcePurge,
        });
      }}
    >
      {PURGE_POLICY_HELP_TEXT}
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.slo.purgeConfirmationModal.purgeTypeLabel', {
          defaultMessage: 'Choose basis by which to purge data',
        })}
      >
        <EuiRadioGroup
          data-test-subj="sloPurgeConfirmationModalPurgeType"
          options={[
            {
              id: 'fixed_age',
              label: i18n.translate('xpack.slo.purgeConfirmationModal.fixedAgeLabel', {
                defaultMessage: 'Age of data',
              }),
            },
            {
              id: 'fixed_time',
              label: i18n.translate('xpack.slo.purgeConfirmationModal.fixedDateTimeLabel', {
                defaultMessage: 'Specific date and time',
              }),
            },
          ]}
          idSelected={purgeType}
          onChange={(val: string) => {
            setPurgeType(val);
          }}
          name="radio group"
        />
      </EuiFormRow>
      {purgeType === 'fixed_age' ? (
        <EuiFormRow label={purgeTimeLabel}>
          <EuiRadioGroup
            data-test-subj="sloPurgeConfirmationModalPurgeAge"
            options={[
              {
                id: '7d',
                label: i18n.translate('xpack.slo.purgeConfirmationModal.last7DaysLabel', {
                  defaultMessage: '7 days',
                }),
              },
              {
                id: '30d',
                label: i18n.translate('xpack.slo.purgeConfirmationModal.last30DaysLabel', {
                  defaultMessage: '30 days',
                }),
              },
              {
                id: '90d',
                label: i18n.translate('xpack.slo.purgeConfirmationModal.last90DaysLabel', {
                  defaultMessage: '90 days',
                }),
              },
            ]}
            idSelected={age}
            onChange={setAge}
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow label={purgeTimeLabel}>
          <EuiDatePicker showTimeSelect selected={purgeDate} onChange={setPurgeDate} />
        </EuiFormRow>
      )}
      <EuiFormRow>
        <EuiCheckbox
          id={basicCheckboxId}
          checked={forcePurge}
          onChange={(e) => {
            setForgePurge(e.target.checked);
          }}
          label={i18n.translate('xpack.slo.purgeConfirmationModal.forcePurge', {
            defaultMessage: 'Ignore purge policy restrictions',
          })}
        />
      </EuiFormRow>
      {forcePurge && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            color="warning"
            size="s"
            title={i18n.translate('xpack.slo.purgeConfirmationModal.forceWarning', {
              defaultMessage:
                'Ignoring purge policy restrictions may delete data that is used to calculate SLOs',
            })}
          />
        </>
      )}
    </EuiConfirmModal>
  );
}
