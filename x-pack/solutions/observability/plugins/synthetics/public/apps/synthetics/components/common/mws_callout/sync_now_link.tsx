/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../../utils/kibana_service';
import { triggerMwSync } from '../../../state/settings/api';

export const SyncNowLink = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      await triggerMwSync();
      kibanaService.toasts.addSuccess(
        i18n.translate('xpack.synthetics.maintenanceWindowCallout.syncTriggered.success', {
          defaultMessage: 'Maintenance window sync started. Changes will apply shortly.',
        })
      );
    } catch (err) {
      kibanaService.toasts.addError(err, {
        title: i18n.translate('xpack.synthetics.maintenanceWindowCallout.syncTriggered.error', {
          defaultMessage: 'Failed to trigger maintenance window sync',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <EuiLink onClick={handleClick} disabled={isLoading} data-test-subj="triggerMwSyncButton">
      {isLoading
        ? i18n.translate('xpack.synthetics.maintenanceWindowCallout.syncing', {
            defaultMessage: 'Syncing...',
          })
        : i18n.translate('xpack.synthetics.maintenanceWindowCallout.syncNow', {
            defaultMessage: 'Sync now',
          })}
    </EuiLink>
  );
};
