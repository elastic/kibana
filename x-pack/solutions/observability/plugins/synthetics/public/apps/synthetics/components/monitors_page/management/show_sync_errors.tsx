/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart } from '@kbn/core/public';
import { ServiceLocationErrors, ServiceLocations } from '../../../../../../common/runtime_types';

export const showSyncErrors = (
  errors: ServiceLocationErrors,
  locations: ServiceLocations,
  core: CoreStart
) => {
  const { notifications, ...startServices } = core;
  Object.values(errors).forEach((location) => {
    const { status: responseStatus, reason } = location.error || {};
    notifications.toasts.addWarning({
      title: i18n.translate('xpack.synthetics.monitorManagement.service.error.title', {
        defaultMessage: `Unable to sync monitor config`,
      }),
      text: toMountPoint(
        <>
          <p>
            {i18n.translate('xpack.synthetics.monitorManagement.service.error.message', {
              defaultMessage: `Your monitor was saved, but there was a problem syncing the configuration for {location}. We will automatically try again later. If this problem continues, your monitors will stop running in {location}. Please contact Support for assistance.`,
              values: {
                location: locations?.find((loc) => loc?.id === location.locationId)?.label,
              },
            })}
          </p>
          {responseStatus || reason ? (
            <p>
              {responseStatus
                ? i18n.translate('xpack.synthetics.monitorManagement.service.error.status', {
                    defaultMessage: 'Status: {status}. ',
                    values: { status: responseStatus },
                  })
                : null}
              {reason
                ? i18n.translate('xpack.synthetics.monitorManagement.service.error.reason', {
                    defaultMessage: 'Reason: {reason}.',
                    values: { reason },
                  })
                : null}
            </p>
          ) : null}
        </>,
        startServices
      ),
      toastLifeTimeMs: 30000,
    });
  });
};
