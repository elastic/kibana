/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WRITE_SYNTHETICS_DEFAULT_RULES_API,
  WRITE_SYNTHETICS_SETTINGS_API,
} from '../../constants/privileges';
import { updateDefaultAlertingRoute } from './update_default_alert';

describe('updateDefaultAlertingRoute', () => {
  it('requires both settings and default-rule management', () => {
    expect(updateDefaultAlertingRoute()).toMatchObject({
      writeAccess: false,
      requiredPrivileges: [WRITE_SYNTHETICS_SETTINGS_API, WRITE_SYNTHETICS_DEFAULT_RULES_API],
    });
  });
});
