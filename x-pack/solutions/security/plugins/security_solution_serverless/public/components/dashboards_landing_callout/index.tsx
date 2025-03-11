/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Services } from '../../common/services';
import { ServicesProvider } from '../../common/services';

import { DashboardsLandingCallout } from './lazy';

export const getDashboardsLandingCallout = (services: Services): React.ComponentType =>
  function DashboardsLandingCalloutComponent() {
    return (
      <ServicesProvider services={services}>
        <DashboardsLandingCallout />
      </ServicesProvider>
    );
  };
