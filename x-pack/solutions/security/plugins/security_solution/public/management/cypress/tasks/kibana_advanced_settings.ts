/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_NEW_FLYOUT_SETTING } from '../../../../common/constants';
import { rootRequest } from './common';

export const disableNewFlyout = () => {
  rootRequest({
    method: 'POST',
    url: '/internal/kibana/settings',
    body: { changes: { [ENABLE_NEW_FLYOUT_SETTING]: false } },
    failOnStatusCode: false,
  });
};
