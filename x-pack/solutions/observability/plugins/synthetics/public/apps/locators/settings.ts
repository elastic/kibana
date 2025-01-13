/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsSettingsLocatorID } from '@kbn/observability-plugin/common';

async function navigate() {
  return {
    app: 'synthetics',
    path: `/settings`,
    state: {},
  };
}

export const syntheticsSettingsNavigatorParams = {
  id: syntheticsSettingsLocatorID,
  getLocation: navigate,
};
