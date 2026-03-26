/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const MaintenanceWindowsLink = ({ id, label }: { id?: string; label?: string }) => {
  const { http } = useKibana().services;
  if (!id) {
    return (
      <EuiLink
        external
        data-test-subj="syntheticsCreateMaintenanceWindowsBtnButton"
        href={http?.basePath.prepend(
          '/app/management/insightsAndAlerting/maintenanceWindows/create'
        )}
        target="_blank"
      >
        {i18n.translate('xpack.synthetics.monitorConfig.maintenanceWindows.createButton', {
          defaultMessage: 'Create',
        })}
      </EuiLink>
    );
  } else {
    return (
      <EuiLink
        external
        data-test-subj="syntheticsEditMaintenanceWindowsBtnButton"
        href={http?.basePath.prepend(
          `/app/management/insightsAndAlerting/maintenanceWindows/edit/${id}`
        )}
        target="_blank"
      >
        {label}
      </EuiLink>
    );
  }
};
