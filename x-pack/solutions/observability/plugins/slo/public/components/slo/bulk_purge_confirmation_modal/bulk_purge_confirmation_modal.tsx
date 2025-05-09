/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
}

export function SloBulkPurgeConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutateAsync: bulkPurge } = useBulkPurgeRollupData();

  const [purgeDate, setPurgeDate] = React.useState<Moment | null>(moment());
  const [purgeType, setPurgeType] = React.useState<string>('fixed_age');
  const [forcePurge, setForgePurge] = React.useState<boolean>(false);
  const [age, setAge] = React.useState('7d');

  const basicCheckboxId = useGeneratedHtmlId({ prefix: 'basicCheckbox' });

  const purgeDisplayType =
    purgeType === 'fixed_age'
      ? i18n.translate('xpack.slo.bulkPurgeConfirmationModal.age', {
          defaultMessage: 'age',
        })
      : i18n.translate('xpack.slo.bulkPurgeConfirmationModal.date', {
          defaultMessage: 'date',
        });

  return (
    <EuiConfirmModal
      buttonColor="risk"
      data-test-subj="sloBulkPurgeConfirmationModal"
      title={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.title', {
        defaultMessage: 'Purge {count} SLOs',
        values: { count: items.length },
      })}
      cancelButtonText={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.confirmButtonLabel', {
        defaultMessage: 'Purge',
      })}
      onCancel={onCancel}
      onConfirm={async () => {
        await bulkPurge({
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
        })
          .then(() => {
            onConfirm();
          })
          .catch((error) => {
            console.error('error', error);
          });
      }}
    >
      {i18n.translate('xpack.slo.bulkPurgeConfirmationModal.descriptionText', {
        defaultMessage:
          'Rollup data for {count} SLOs will be purged according to the policy provided below.',
        values: { count: items.length },
      })}
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.purgeTypeLabel', {
          defaultMessage: 'Purge type',
        })}
      >
        <EuiRadioGroup
          data-test-subj="sloBulkPurgeConfirmationModalPurgeType"
          options={[
            {
              id: 'fixed_age',
              label: i18n.translate('xpack.slo.bulkPurgeConfirmationModal.fixedAgeLabel', {
                defaultMessage: 'Fixed age',
              }),
            },
            {
              id: 'fixed_time',
              label: i18n.translate('xpack.slo.bulkPurgeConfirmationModal.fixedDateTimeLabel', {
                defaultMessage: 'Fixed date/time',
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
        <EuiFormRow
          label={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.purgeAgeLabel', {
            defaultMessage: 'Purge age',
          })}
        >
          <EuiRadioGroup
            data-test-subj="sloBulkPurgeConfirmationModalPurgeAge"
            options={[
              {
                id: '7d',
                label: i18n.translate('xpack.slo.bulkPurgeConfirmationModal.last7DaysLabel', {
                  defaultMessage: 'Last 7 days',
                }),
              },
              {
                id: '30d',
                label: i18n.translate('xpack.slo.bulkPurgeConfirmationModal.last30DaysLabel', {
                  defaultMessage: 'Last 30 days',
                }),
              },
              {
                id: '90d',
                label: i18n.translate('xpack.slo.bulkPurgeConfirmationModal.last90DaysLabel', {
                  defaultMessage: 'Last 90 days',
                }),
              },
            ]}
            idSelected={age}
            onChange={setAge}
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow
          label={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.purgeDateLabel', {
            defaultMessage: 'Purge date',
          })}
        >
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
          label={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.forcePurge', {
            defaultMessage: 'Ignore purge policy restrictions',
          })}
        />
      </EuiFormRow>
    </EuiConfirmModal>
  );
}
