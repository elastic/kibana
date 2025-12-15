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
import type { BulkPurgePolicyInput } from '@kbn/slo-schema';
import type { Moment } from 'moment';
import moment from 'moment';
import React from 'react';

interface Props {
  onCancel: () => void;
  onConfirm: (purgePolicy: BulkPurgePolicyInput, force: boolean) => void;
  purgePolicyHelpText: string;
}

export function PurgeRollupConfirmationModal({ purgePolicyHelpText, onCancel, onConfirm }: Props) {
  const [purgeDate, setPurgeDate] = React.useState<Moment | null>(moment());
  const [purgeType, setPurgeType] = React.useState<string>('fixed_age');
  const [forcePurge, setForgePurge] = React.useState<boolean>(false);
  const [age, setAge] = React.useState('7d');

  const checkboxId = useGeneratedHtmlId();
  const modalTitleId = useGeneratedHtmlId();

  const purgeTimeLabel = i18n.translate('xpack.slo.purgeConfirmationModal.purgeDataDescription', {
    defaultMessage: 'Purge data older than',
  });

  const onClickConfirm = () => {
    if (purgeType === 'fixed_age') {
      onConfirm({ purgeType, age }, forcePurge);
    }

    if (purgeType === 'fixed_time' && purgeDate) {
      onConfirm({ purgeType, timestamp: purgeDate.toISOString() }, forcePurge);
    }

    throw new Error('Unsupported purge type');
  };

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.slo.purgeConfirmationModal.title', {
        defaultMessage: 'Purge rollup data',
      })}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      data-test-subj="sloPurgeConfirmationModal"
      cancelButtonText={i18n.translate('xpack.slo.purgeConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.purgeConfirmationModal.confirmButtonLabel', {
        defaultMessage: 'Purge',
      })}
      onCancel={onCancel}
      onConfirm={onClickConfirm}
    >
      {purgePolicyHelpText}
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.slo.purgeConfirmationModal.purgeTypeLabel', {
          defaultMessage: 'Purge data based on',
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
          name="purgeType"
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
            name="purgeAge"
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow label={purgeTimeLabel}>
          <EuiDatePicker showTimeSelect selected={purgeDate} onChange={setPurgeDate} />
        </EuiFormRow>
      )}
      <EuiFormRow>
        <EuiCheckbox
          id={checkboxId}
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
            announceOnMount
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
