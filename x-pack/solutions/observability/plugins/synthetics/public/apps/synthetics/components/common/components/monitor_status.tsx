/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiDescriptionList, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EncryptedSyntheticsMonitor } from '../../../../../../common/runtime_types';

export const BadgeStatus = ({
  status,
  isBrowserType,
}: {
  status?: string;
  isBrowserType: boolean;
}) => {
  return !status || status === 'unknown' ? (
    <EuiBadge color="default" data-test-subj="monitorLatestStatusPending">
      {PENDING_LABEL}
    </EuiBadge>
  ) : status === 'up' ? (
    <EuiBadge color="success" data-test-subj="monitorLatestStatusUp">
      {isBrowserType ? SUCCESS_LABEL : UP_LABEL}
    </EuiBadge>
  ) : (
    <EuiBadge color="danger" data-test-subj="monitorLatestStatusDown">
      {isBrowserType ? FAILED_LABEL : DOWN_LABEL}
    </EuiBadge>
  );
};

export const MonitorStatus = ({
  loading,
  monitor,
  status,
  compressed = true,
}: {
  loading?: boolean;
  compressed?: boolean;
  monitor: EncryptedSyntheticsMonitor;
  status?: string;
}) => {
  const isBrowserType = monitor.type === 'browser';
  const loadingContent = loading && !monitor;

  return (
    <EuiDescriptionList
      align="left"
      compressed={compressed}
      listItems={[
        {
          title: STATUS_LABEL,
          description: loadingContent ? (
            <EuiSkeletonText lines={1} />
          ) : (
            <BadgeStatus status={status} isBrowserType={isBrowserType} />
          ),
        },
      ]}
    />
  );
};

export const STATUS_LABEL = i18n.translate('xpack.synthetics.monitorStatus.statusLabel', {
  defaultMessage: 'Status',
});

const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.failedLabel', {
  defaultMessage: 'Failed',
});

const PENDING_LABEL = i18n.translate('xpack.synthetics.monitorStatus.pendingLabel', {
  defaultMessage: 'Pending',
});

const SUCCESS_LABEL = i18n.translate('xpack.synthetics.monitorStatus.succeededLabel', {
  defaultMessage: 'Succeeded',
});

const UP_LABEL = i18n.translate('xpack.synthetics.monitorStatus.upLabel', {
  defaultMessage: 'Up',
});

const DOWN_LABEL = i18n.translate('xpack.synthetics.monitorStatus.downLabel', {
  defaultMessage: 'Down',
});
