/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RECOMMENDED_ACTIONS,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '../../../constants';
import {
  PND_GATE_IDS,
  PND_GATE_REGISTRY,
  PND_GATE_STEP_IDS,
  getGateDefinition,
  getGateDefinitionByGateId,
  isAlwaysGate,
  isGateAutoAcceptable,
  resolveAutoAcceptableGates,
} from '.';

describe('PND_GATE_REGISTRY', () => {
  it('registers exactly four gates', () => {
    expect(PND_GATE_REGISTRY).toHaveLength(4);
  });

  it('draws every recommendedAction from RECOMMENDED_ACTIONS', () => {
    PND_GATE_REGISTRY.forEach((gate) => {
      expect(RECOMMENDED_ACTIONS).toContain(gate.recommendedAction);
    });
  });

  it('flags exactly the two consequential gates as alwaysGate', () => {
    expect(PND_GATE_REGISTRY.filter((gate) => gate.alwaysGate).map((gate) => gate.stepId)).toEqual([
      PND_GATE_STEP_IDS.awaitIncidentContained,
      PND_GATE_STEP_IDS.awaitApplyTuning,
    ]);
  });
});

/**
 * kibana-phf4.5 / ADR-015: the Attack Discovery lane moved from `watch_deep.yaml` to
 * `watch_floor.yaml`, and `workflowId` is the only field in PND that names the watch a gate belongs
 * to — so the whole relocation is these three rows. The fourth row is the Detection Watch's tuning
 * gate, which did not move, and every other field on all four rows is untouched: the gate ids and
 * step ids are the contract `_respond` validates against and every derived thread id keys on.
 */
describe('PND_GATE_REGISTRY workflowId (the kibana-phf4.5 lane relocation, ADR-015)', () => {
  it('owns the three lane gates on the Watch Floor', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => gate.workflowId === SYSTEM_SECURITY_WATCH_FLOOR_ID).map(
        (gate) => gate.gateId
      )
    ).toEqual([
      PND_GATE_IDS.openInvestigation,
      PND_GATE_IDS.promoteIncident,
      PND_GATE_IDS.incidentContained,
    ]);
  });

  it('leaves the fourth row on the Detection Watch', () => {
    expect(
      PND_GATE_REGISTRY.filter(
        (gate) => gate.workflowId === SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID
      ).map((gate) => gate.gateId)
    ).toEqual([PND_GATE_IDS.applyTuning]);
  });

  it('names exactly those two watches across the whole registry', () => {
    expect(new Set(PND_GATE_REGISTRY.map((gate) => gate.workflowId))).toEqual(
      new Set([SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID])
    );
  });

  it('owns no gate on the Deep Watch, which is a beta stub again', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => gate.workflowId === SYSTEM_SECURITY_WATCH_DEEP_ID)
    ).toEqual([]);
  });

  it('no longer resolves a lane gate keyed on the Deep Watch', () => {
    expect(
      getGateDefinition(SYSTEM_SECURITY_WATCH_DEEP_ID, PND_GATE_STEP_IDS.awaitOpenInvestigation)
    ).toBeUndefined();
  });

  // The move changed `workflowId` and nothing else: `_respond` allow-lists on `stepId`, and every
  // thread id keys on `gateId`, so a drifted pairing here would invalidate persisted state.
  it('leaves every (gateId, stepId) pairing exactly as it was before the move', () => {
    expect(PND_GATE_REGISTRY.map(({ gateId, stepId }) => ({ gateId, stepId }))).toEqual([
      { gateId: 'open_investigation', stepId: 'await_open_investigation' },
      { gateId: 'promote_incident', stepId: 'await_promote_incident' },
      { gateId: 'incident_contained', stepId: 'await_incident_contained' },
      { gateId: 'apply_tuning', stepId: 'await_apply_tuning' },
    ]);
  });
});

describe('PND_GATE_REGISTRY autoApproveResponse', () => {
  it('gives every non-alwaysGate an approve response', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => !gate.alwaysGate).map((gate) => gate.autoApproveResponse)
    ).toEqual([{ decision: 'approve' }, { decision: 'approve' }]);
  });

  it('never gives an alwaysGate an autoApproveResponse', () => {
    PND_GATE_REGISTRY.filter((gate) => gate.alwaysGate).forEach((gate) => {
      expect(gate.autoApproveResponse).toBeUndefined();
    });
  });
});

/**
 * Queue / chat row labels (D, spec: imperative verb + object, at most 30 characters, never a
 * bare "Approve", never a noun). Pinned here so `.12` / `.15` read them rather than restating copy.
 */
describe('PND_GATE_REGISTRY actionLabel', () => {
  it('names every gate with an imperative verb + object', () => {
    expect(PND_GATE_REGISTRY.map(({ actionLabel, gateId }) => ({ actionLabel, gateId }))).toEqual([
      { actionLabel: 'Open an investigation', gateId: PND_GATE_IDS.openInvestigation },
      { actionLabel: 'Escalate to an incident', gateId: PND_GATE_IDS.promoteIncident },
      { actionLabel: 'Confirm containment', gateId: PND_GATE_IDS.incidentContained },
      { actionLabel: 'Apply the rule tuning', gateId: PND_GATE_IDS.applyTuning },
    ]);
  });

  it('caps every actionLabel at 30 characters', () => {
    PND_GATE_REGISTRY.forEach((gate) => {
      expect(gate.actionLabel.length).toBeGreaterThan(0);
      expect(gate.actionLabel.length).toBeLessThanOrEqual(30);
    });
  });

  it('never uses a bare Approve or a single-word noun', () => {
    PND_GATE_REGISTRY.forEach((gate) => {
      expect(gate.actionLabel.toLowerCase().startsWith('approve')).toBe(false);
      expect(gate.actionLabel).toContain(' ');
    });
  });
});

/**
 * D2 / D16. `role` records what the gate's decision *is about*, so "a Proposal is a card, never a
 * container" is type-checked rather than remembered: exactly two gates open a container
 * (Investigation and Incident), and nothing may add a third.
 *
 * `parentKind` is the container the gate's thread hangs under once that container exists — it is
 * always **re-derived on read, never stored** (D4). kibana-tjil.8 / C4 mints the investigation
 * container before the first gate, so an orphan investigation thread is no longer the normal case.
 *
 * `threadAgentKind` names which of the three installed PND agents answers the thread (D3 — there is
 * no fourth agent). `apply_tuning` is the single gate where the two diverge.
 */
describe('PND_GATE_REGISTRY role / parentKind / threadAgentKind (D2)', () => {
  it('classifies every gate', () => {
    expect(
      PND_GATE_REGISTRY.map(({ gateId, parentKind, role, threadAgentKind }) => ({
        gateId,
        parentKind,
        role,
        threadAgentKind,
      }))
    ).toEqual([
      {
        gateId: PND_GATE_IDS.openInvestigation,
        parentKind: 'investigation',
        role: 'container',
        threadAgentKind: 'investigation',
      },
      {
        gateId: PND_GATE_IDS.promoteIncident,
        parentKind: 'incident',
        role: 'container',
        threadAgentKind: 'incident',
      },
      {
        gateId: PND_GATE_IDS.incidentContained,
        parentKind: 'incident',
        role: 'proposal_thread',
        threadAgentKind: 'incident',
      },
      {
        gateId: PND_GATE_IDS.applyTuning,
        parentKind: 'incident',
        role: 'worker_thread',
        threadAgentKind: 'tuning',
      },
    ]);
  });

  it('reaches exactly two containers, and there is never a third (D16)', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => gate.role === 'container').map((gate) => gate.gateId)
    ).toEqual([PND_GATE_IDS.openInvestigation, PND_GATE_IDS.promoteIncident]);
  });

  it('covers each of the two container kinds exactly once', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => gate.role === 'container').map((gate) => gate.parentKind)
    ).toEqual(['investigation', 'incident']);
  });

  it('classifies the tuning gate as a worker thread rather than a container (ADR-013)', () => {
    expect(getGateDefinitionByGateId(PND_GATE_IDS.applyTuning)?.role).toBe('worker_thread');
  });

  it('diverges parentKind from threadAgentKind on apply_tuning alone', () => {
    expect(
      PND_GATE_REGISTRY.filter((gate) => gate.parentKind !== gate.threadAgentKind).map(
        (gate) => gate.gateId
      )
    ).toEqual([PND_GATE_IDS.applyTuning]);
  });

  it('draws every threadAgentKind from the three installed PND agents (D3)', () => {
    PND_GATE_REGISTRY.forEach((gate) => {
      expect(['incident', 'investigation', 'tuning']).toContain(gate.threadAgentKind);
    });
  });
});

describe('getGateDefinitionByGateId', () => {
  it.each(Object.values(PND_GATE_IDS))('resolves the "%s" gate', (gateId) => {
    expect(getGateDefinitionByGateId(gateId)?.gateId).toBe(gateId);
  });

  it('returns undefined for an unknown gateId', () => {
    expect(getGateDefinitionByGateId('not_a_pnd_gate')).toBeUndefined();
  });

  it('returns undefined for a `waitForInput` step id, which is not a gate id', () => {
    expect(getGateDefinitionByGateId(PND_GATE_STEP_IDS.awaitApplyTuning)).toBeUndefined();
  });
});

describe('isAlwaysGate (D15, kibana-phf4.14)', () => {
  it('flags the containment gate', () => {
    expect(isAlwaysGate(PND_GATE_IDS.incidentContained)).toBe(true);
  });

  it('flags the apply-tuning gate', () => {
    expect(isAlwaysGate(PND_GATE_IDS.applyTuning)).toBe(true);
  });

  it('does not flag the open-investigation gate', () => {
    expect(isAlwaysGate(PND_GATE_IDS.openInvestigation)).toBe(false);
  });

  it('does not flag the promote-incident gate', () => {
    expect(isAlwaysGate(PND_GATE_IDS.promoteIncident)).toBe(false);
  });

  it('agrees with the registry row for every gate, so no caller needs its own copy of the flag', () => {
    expect(PND_GATE_REGISTRY.map(({ gateId }) => isAlwaysGate(gateId))).toEqual(
      PND_GATE_REGISTRY.map(({ alwaysGate }) => alwaysGate)
    );
  });

  it('returns false for an unknown gateId, which is no gate rather than a permitted one', () => {
    expect(isAlwaysGate('host-isolation')).toBe(false);
  });
});

describe('getGateDefinition', () => {
  it('resolves a registered gate', () => {
    expect(
      getGateDefinition(SYSTEM_SECURITY_WATCH_FLOOR_ID, PND_GATE_STEP_IDS.awaitOpenInvestigation)
        ?.gateId
    ).toBe('open_investigation');
  });

  it('returns undefined for an unknown workflowId', () => {
    expect(
      getGateDefinition('not-a-pnd-workflow', PND_GATE_STEP_IDS.awaitOpenInvestigation)
    ).toBeUndefined();
  });

  it('returns undefined for an unknown stepId', () => {
    expect(
      getGateDefinition(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'await_something_else')
    ).toBeUndefined();
  });

  it('resolves a registered gate from the per-space document id when spaceId is passed', () => {
    expect(
      getGateDefinition(
        `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-default`,
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        'default'
      )?.gateId
    ).toBe('open_investigation');
  });

  it('does not resolve a catalog-looking document id without spaceId', () => {
    expect(
      getGateDefinition(
        `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-default`,
        PND_GATE_STEP_IDS.awaitOpenInvestigation
      )
    ).toBeUndefined();
  });

  it('does not resolve a catalog-looking id with a different suffix', () => {
    expect(
      getGateDefinition(
        `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-evil`,
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        'default'
      )
    ).toBeUndefined();
  });
});

describe('resolveAutoAcceptableGates', () => {
  it('auto-accepts nothing at manual', () => {
    expect(resolveAutoAcceptableGates('manual')).toHaveLength(0);
  });

  it('auto-accepts only reversible gates at assisted', () => {
    expect(resolveAutoAcceptableGates('assisted').map((gate) => gate.stepId)).toEqual([
      PND_GATE_STEP_IDS.awaitOpenInvestigation,
    ]);
  });

  it('auto-accepts every non-alwaysGate gate at supervised', () => {
    expect(resolveAutoAcceptableGates('supervised').map((gate) => gate.stepId)).toEqual([
      PND_GATE_STEP_IDS.awaitOpenInvestigation,
      PND_GATE_STEP_IDS.awaitPromoteIncident,
    ]);
  });

  it('never auto-accepts the two alwaysGate gates at supervised', () => {
    const stepIds = resolveAutoAcceptableGates('supervised').map((gate) => gate.stepId);

    expect(stepIds).not.toContain(PND_GATE_STEP_IDS.awaitIncidentContained);
    expect(stepIds).not.toContain(PND_GATE_STEP_IDS.awaitApplyTuning);
  });

  it('fails closed for a level outside the shared scale', () => {
    expect(resolveAutoAcceptableGates('autonomous')).toHaveLength(0);
  });

  // The 1..3 ordinals are gone from every layer, but a space seeded before the conversion can
  // still hold one in `pnd:autonomy:<watchId>`. It must read as "no autonomy", not as Supervised.
  it('fails closed for a legacy ordinal level', () => {
    expect(resolveAutoAcceptableGates(3)).toHaveLength(0);
  });
});

describe('isGateAutoAcceptable', () => {
  it('never auto-accepts an unknown (workflowId, stepId), even at supervised', () => {
    expect(
      isGateAutoAcceptable('not-a-pnd-workflow', 'await_open_investigation', 'supervised')
    ).toBe(false);
  });

  it('never auto-accepts an unknown stepId on a known workflow at supervised', () => {
    expect(
      isGateAutoAcceptable(SYSTEM_SECURITY_WATCH_FLOOR_ID, 'await_mystery', 'supervised')
    ).toBe(false);
  });

  it('never auto-accepts the alwaysGate containment gate at supervised', () => {
    expect(
      isGateAutoAcceptable(
        SYSTEM_SECURITY_WATCH_FLOOR_ID,
        PND_GATE_STEP_IDS.awaitIncidentContained,
        'supervised'
      )
    ).toBe(false);
  });

  it('auto-accepts the reversible open-investigation gate at assisted', () => {
    expect(
      isGateAutoAcceptable(
        SYSTEM_SECURITY_WATCH_FLOOR_ID,
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        'assisted'
      )
    ).toBe(true);
  });

  it('does not auto-accept the irreversible promote gate at assisted', () => {
    expect(
      isGateAutoAcceptable(
        SYSTEM_SECURITY_WATCH_FLOOR_ID,
        PND_GATE_STEP_IDS.awaitPromoteIncident,
        'assisted'
      )
    ).toBe(false);
  });

  it('fails closed at manual for a reversible gate', () => {
    expect(
      isGateAutoAcceptable(
        SYSTEM_SECURITY_WATCH_FLOOR_ID,
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        'manual'
      )
    ).toBe(false);
  });

  it('fails closed for a legacy ordinal level on a reversible gate', () => {
    expect(
      isGateAutoAcceptable(
        SYSTEM_SECURITY_WATCH_FLOOR_ID,
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        2
      )
    ).toBe(false);
  });
});
