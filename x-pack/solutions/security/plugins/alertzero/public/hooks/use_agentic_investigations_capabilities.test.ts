/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { getAgenticInvestigationsCapabilities } from './use_agentic_investigations_capabilities';

const caps = (overrides: object = {}): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    agenticInvestigations: {
      showEscalations: false,
      manageEscalations: false,
      manageInvestigations: false,
      ...overrides,
    },
  } as unknown as Capabilities);

describe('getAgenticInvestigationsCapabilities', () => {
  it('returns all false when no capabilities are set', () => {
    expect(getAgenticInvestigationsCapabilities({} as Capabilities)).toEqual({
      showEscalations: false,
      manageEscalations: false,
      manageInvestigations: false,
    });
  });

  it('maps showEscalations correctly', () => {
    expect(getAgenticInvestigationsCapabilities(caps({ showEscalations: true }))).toMatchObject({
      showEscalations: true,
    });
  });

  it('maps manageEscalations correctly', () => {
    expect(getAgenticInvestigationsCapabilities(caps({ manageEscalations: true }))).toMatchObject({
      manageEscalations: true,
    });
  });

  it('maps manageInvestigations correctly', () => {
    expect(
      getAgenticInvestigationsCapabilities(caps({ manageInvestigations: true }))
    ).toMatchObject({
      manageInvestigations: true,
    });
  });

  it('returns false when a capability is a non-boolean truthy value', () => {
    // Kibana stores capabilities as booleans; treat anything that is not exactly `true` as false.
    expect(getAgenticInvestigationsCapabilities(caps({ showEscalations: 1 }))).toMatchObject({
      showEscalations: false,
    });
  });

  it('returns all flags for a fully granted capabilities object', () => {
    expect(
      getAgenticInvestigationsCapabilities(
        caps({ showEscalations: true, manageEscalations: true, manageInvestigations: true })
      )
    ).toEqual({
      showEscalations: true,
      manageEscalations: true,
      manageInvestigations: true,
    });
  });
});
