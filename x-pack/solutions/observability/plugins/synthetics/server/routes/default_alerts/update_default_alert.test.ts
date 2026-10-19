/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WRITE_SYNTHETICS_DEFAULT_RULES_API } from '../../feature';
import { updateDefaultAlertingRoute } from './update_default_alert';

describe('updateDefaultAlertingRoute', () => {
  it('accepts either legacy write or default-rule management', () => {
    expect(updateDefaultAlertingRoute()).toMatchObject({
      writeAccess: false,
      anyRequiredPrivileges: ['uptime-write', WRITE_SYNTHETICS_DEFAULT_RULES_API],
    });
  });
});
