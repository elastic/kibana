/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attackDiscoveryAlertFieldMap } from './field_map';
import {
  ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE,
  ALERT_ATTACK_DISCOVERY_TITLE,
} from './field_names';

describe('attackDiscoveryAlertFieldMap', () => {
  it('contains a mapping for the title field', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        attackDiscoveryAlertFieldMap,
        ALERT_ATTACK_DISCOVERY_TITLE
      )
    ).toBe(true);
  });

  it('maps generation_source as an optional non-array keyword', () => {
    expect(attackDiscoveryAlertFieldMap[ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE]).toEqual({
      type: 'keyword',
      array: false,
      required: false,
    });
  });

  it('resolves ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE to kibana.alert.attack_discovery.generation_source', () => {
    expect(ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE).toBe(
      'kibana.alert.attack_discovery.generation_source'
    );
  });
});
