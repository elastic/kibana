/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parity guard for the duplicated Attack Discovery alerts-as-data field map.
 *
 * The Attack Discovery alert field map exists in TWO places, on purpose:
 *
 *   1. canonical — `x-pack/solutions/security/packages/kbn-attack-discovery-schedules-common/impl/fields/field_map.ts`
 *      (exported from `@kbn/attack-discovery-schedules-common`, used by
 *      `elastic_assistant/server/plugin.ts`)
 *   2. fork — `x-pack/solutions/security/packages/kbn-discoveries/impl/attack_discovery/alert_fields/alert_field_map.ts`
 *      (exported from `@kbn/discoveries/impl/attack_discovery/alert_fields`, used by
 *      `discoveries/server/plugin.ts`)
 *
 * The duplication is DELIBERATE: it is a step toward `@kbn/discoveries` becoming a
 * standalone package. Do NOT de-duplicate the two copies to make this test pass.
 *
 * Both plugins call `ruleRegistry.ruleDataService.initializeIndex(...)` with the same
 * `registrationContext` + `dataset` + `additionalPrefix`, so both install the SAME
 * component template (`.adhoc.alerts-security.attack.discovery.alerts-mappings`). If the
 * two copies drift, the installed mappings depend on plugin install order — which is why
 * every change to one copy must be mirrored in the other. This test fails when they drift.
 *
 * See ADR-015 in `x-pack/solutions/security/plugins/discoveries/README.md`.
 */

import {
  attackDiscoveryAlertFieldMap as canonicalFieldMap,
  ATTACK_DISCOVERY_ALERTS_CONTEXT as canonicalContext,
} from '@kbn/attack-discovery-schedules-common';
import {
  attackDiscoveryAlertFieldMap as forkedFieldMap,
  ATTACK_DISCOVERY_ALERTS_CONTEXT as forkedContext,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';

describe('Attack Discovery alerts index parity', () => {
  it('declares identical field definitions in both copies of the field map', () => {
    expect(forkedFieldMap).toEqual(canonicalFieldMap);
  });

  it('uses the same registration context in both copies', () => {
    expect(forkedContext).toBe(canonicalContext);
  });
});
