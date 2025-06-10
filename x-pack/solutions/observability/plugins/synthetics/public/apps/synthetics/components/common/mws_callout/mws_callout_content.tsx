/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MaintenanceWindow } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/types';

export const MwsCalloutContent = ({ activeMWs }: { activeMWs: MaintenanceWindow[] }) => {
  if (activeMWs.length) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate(
            'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActive.monitors',
            {
              defaultMessage: 'Maintenance windows are active',
            }
          )}
          color="warning"
          iconType="iInCircle"
          data-test-subj="maintenanceWindowCallout"
        >
          {i18n.translate(
            'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActiveDescription.monitors',
            {
              defaultMessage:
                'Monitors are stopped while maintenance windows are running. Active maintenance windows are {titles}.',
              values: {
                titles: activeMWs.map((mw) => mw.title).join(', '),
              },
            }
          )}
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  } else {
    return null;
  }
};
