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
  onClickBadge,
}: {
  status?: string;
  isBrowserType: boolean;
  onClickBadge?: () => void;
}) => {
  const { color, dataTestSubj, labels } = badgeMapping[status || 'unknown'];
  const label = isBrowserType && labels.browser ? labels.browser : labels.default;

  return (
    <EuiBadge
      color={color}
      data-test-subj={dataTestSubj}
      onClick={() => {
        if (onClickBadge) onClickBadge();
      }}
      onClickAriaLabel={CLICK_BADGE_ARIA_LABEL}
    >
      {label}
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

const DISABLED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.disabledLabel', {
  defaultMessage: 'Disabled',
});

const CLICK_BADGE_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitorStatus.clickBadgeAriaLabel',
  {
    defaultMessage: 'Click to trigger the related action',
  }
);

interface BadgeData {
  color: string;
  dataTestSubj: string;
  labels: { default: string; browser?: string };
}

const badgeMapping: Record<string, BadgeData> = {
  unknown: {
    color: 'default',
    dataTestSubj: 'monitorLatestStatusPending',
    labels: { default: PENDING_LABEL },
  },
  up: {
    color: 'success',
    dataTestSubj: 'monitorLatestStatusUp',
    labels: { default: UP_LABEL, browser: SUCCESS_LABEL },
  },
  down: {
    color: 'danger',
    dataTestSubj: 'monitorLatestStatusDown',
    labels: { default: DOWN_LABEL, browser: FAILED_LABEL },
  },
  disabled: {
    color: 'default',
    dataTestSubj: 'monitorLatestStatusDisabled',
    labels: { default: DISABLED_LABEL },
  },
};
