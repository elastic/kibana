/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { TrustedDevicesList } from './view/trusted_devices_list';

export const TrustedDevicesContainer = memo(() => {
  return (
    <Routes>
      <Route path={MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH} exact component={TrustedDevicesList} />
      <Route path="*" component={NotFoundPage} />
    </Routes>
  );
});

TrustedDevicesContainer.displayName = 'TrustedDevicesContainer';
