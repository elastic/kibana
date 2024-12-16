/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { MonitorTypePortalNode } from '../portals';
import { FormMonitorType } from '../types';

import { MonitorType } from './monitor_type';

export const MonitorTypePortal = ({ monitorType }: { monitorType: FormMonitorType }) => {
  return (
    <InPortal node={MonitorTypePortalNode}>
      <MonitorType monitorType={monitorType} />
    </InPortal>
  );
};
