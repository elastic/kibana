/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup } from '@elastic/eui';
import { useOverviewStatusState } from '../../hooks/use_overview_status';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';
import {
  STATUS_DISABLED_LABEL,
  STATUS_DOWN_LABEL,
  STATUS_PENDING_LABEL,
  STATUS_STALE_LABEL,
  STATUS_UP_LABEL,
} from '../../common/monitor_filters/filter_labels';

export const QuickFilters = () => {
  const { statusFilter } = useGetUrlParams();
  const [_, updateUrlParams] = useUrlParams();
  const { status } = useOverviewStatusState();

  const handleFilterUpdate = (monitorStatus: string) => {
    updateUrlParams({ statusFilter: statusFilter !== monitorStatus ? monitorStatus : undefined });
  };

  const statusButtons = [
    {
      id: 'up',
      label: STATUS_UP_LABEL,
    },
    {
      id: 'down',
      label: STATUS_DOWN_LABEL,
    },
    {
      id: 'disabled',
      label: STATUS_DISABLED_LABEL,
    },
  ];
  if (status?.pending && status?.pending > 0) {
    statusButtons.push({
      id: 'pending',
      label: STATUS_PENDING_LABEL,
    });
  }
  if (status?.stale && status?.stale > 0) {
    statusButtons.push({
      id: 'stale',
      label: STATUS_STALE_LABEL,
    });
  }
  return (
    <EuiButtonGroup
      buttonSize="m"
      legend={i18n.translate('xpack.synthetics.overview.status.filters.legend', {
        defaultMessage: 'Monitor status',
      })}
      options={statusButtons}
      idSelected={statusFilter}
      onChange={handleFilterUpdate}
    />
  );
};
