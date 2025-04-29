/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { MonitorPageLink } from './monitor_page_link';
import { CertMonitor } from '../../../../../common/runtime_types';

interface Props {
  monitors: CertMonitor[];
}

export const CertMonitors: React.FC<Props> = ({ monitors }) => {
  return (
    <span>
      {monitors.map((mon: CertMonitor, ind: number) => (
        <span key={mon.id}>
          {ind > 0 && ', '}
          <EuiToolTip content={mon.url}>
            <MonitorPageLink configId={mon.configId!}>{mon.name || mon.id}</MonitorPageLink>
          </EuiToolTip>
        </span>
      ))}
    </span>
  );
};
