/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attackDiscoveryAlertFieldMap } from './field_map';
import { ALERT_ATTACK_DISCOVERY_TITLE } from './field_names';

describe('attackDiscoveryAlertFieldMap', () => {
  it('contains a mapping for the title field', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        attackDiscoveryAlertFieldMap,
        ALERT_ATTACK_DISCOVERY_TITLE
      )
    ).toBe(true);
  });
});
