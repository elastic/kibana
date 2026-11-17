/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineStatus } from '@kbn/entity-store/common';

const STATUS: Record<EngineStatus | 'not_installed', { color: string; label: string }> = {
  started: {
    color: 'success',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.status.running', {
      defaultMessage: 'Running',
    }),
  },
  stopped: {
    color: 'subdued',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.status.stopped', {
      defaultMessage: 'Stopped',
    }),
  },
  installing: {
    color: 'warning',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.status.installing', {
      defaultMessage: 'Installing',
    }),
  },
  updating: {
    color: 'warning',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.status.updating', {
      defaultMessage: 'Updating',
    }),
  },
  error: {
    color: 'danger',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.status.error', {
      defaultMessage: 'Error',
    }),
  },
  not_installed: {
    color: 'subdued',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityStore.status.notInstalled',
      { defaultMessage: 'Not installed' }
    ),
  },
};

/** An engine's status as a colored dot with its name, so color is never the only signal. */
export const EngineStatusBadge = ({ status }: { status: EngineStatus | undefined }) => {
  const { color, label } = STATUS[status ?? 'not_installed'];
  return <EuiHealth color={color}>{label}</EuiHealth>;
};
