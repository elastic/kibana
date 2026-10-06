/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { getAlertZeroInvestigationsCapabilities } from './use_alertzero_investigations_capabilities';

const caps = (
  overrides: {
    showEscalations?: unknown;
    manageEscalations?: unknown;
    manageInvestigations?: unknown;
  } = {}
): Capabilities =>
  ({
    alertzero: { show: true, write: true },
    navLinks: {},
    management: {},
    catalogue: {},
    agenticInvestigations: {
      manageInvestigations: false,
      ...('manageInvestigations' in overrides
        ? { manageInvestigations: overrides.manageInvestigations }
        : {}),
      showEscalations: false,
      manageEscalations: false,
      ...('showEscalations' in overrides ? { showEscalations: overrides.showEscalations } : {}),
      ...('manageEscalations' in overrides
        ? { manageEscalations: overrides.manageEscalations }
        : {}),
    },
  } as unknown as Capabilities);

describe('getAlertZeroInvestigationsCapabilities', () => {
  it('returns all false when no capabilities are set', () => {
    expect(getAlertZeroInvestigationsCapabilities({} as Capabilities)).toEqual({
      showEscalations: false,
      manageEscalations: false,
      manageInvestigations: false,
    });
  });

  it('maps showEscalations correctly', () => {
    expect(getAlertZeroInvestigationsCapabilities(caps({ showEscalations: true }))).toMatchObject({
      showEscalations: true,
    });
  });

  it('maps manageEscalations correctly', () => {
    expect(getAlertZeroInvestigationsCapabilities(caps({ manageEscalations: true }))).toMatchObject(
      {
        manageEscalations: true,
      }
    );
  });

  it('maps manageInvestigations correctly', () => {
    expect(
      getAlertZeroInvestigationsCapabilities(caps({ manageInvestigations: true }))
    ).toMatchObject({
      manageInvestigations: true,
    });
  });

  it('returns false when a capability is a non-boolean truthy value', () => {
    // Kibana stores capabilities as booleans; treat anything that is not exactly `true` as false.
    expect(getAlertZeroInvestigationsCapabilities(caps({ showEscalations: 1 }))).toMatchObject({
      showEscalations: false,
    });
  });

  it('returns all flags for a fully granted capabilities object', () => {
    expect(
      getAlertZeroInvestigationsCapabilities(
        caps({ showEscalations: true, manageEscalations: true, manageInvestigations: true })
      )
    ).toEqual({
      showEscalations: true,
      manageEscalations: true,
      manageInvestigations: true,
    });
  });
  it('requires AlertZero write as well as the dependent feature privileges', () => {
    const capabilities = caps({
      showEscalations: true,
      manageEscalations: true,
      manageInvestigations: true,
    });
    expect(
      getAlertZeroInvestigationsCapabilities({
        ...capabilities,
        alertzero: { show: true, write: false },
      })
    ).toEqual({
      showEscalations: true,
      manageEscalations: false,
      manageInvestigations: false,
    });
  });
});
