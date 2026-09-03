/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getManagedWorkflowDefinition,
  PND_INSTALLABLE_WORKFLOW_IDS,
  PND_MANAGED_WATCH_WORKFLOW_IDS as MANAGED_PND_MANAGED_WATCH_WORKFLOW_IDS,
  // Both packages export `PND_WATCH_WORKFLOW_IDS`. The name collision is exactly the mistake this
  // file exists to catch, so every managed-side import is aliased and every unaliased name below is
  // the `@kbn/pnd-common` one.
  PND_RULE_CREATION_WORKFLOW_ID as MANAGED_PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID as MANAGED_PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID as MANAGED_PND_RULE_TUNING_WORKFLOW_ID,
  PND_WATCH_AUTO_APPROVER_WORKFLOW_ID as MANAGED_PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID as MANAGED_PND_WATCH_DETECTION_WORKFLOW_ID,
  PND_WATCH_WORKFLOW_IDS as MANAGED_PND_WATCH_WORKFLOW_IDS,
  PND_WORKFLOW_TEMPLATE_VALUES,
} from '@kbn/workflows/managed';
import { parse } from 'yaml';

import {
  PND_SIGNAL_DRIVEN_WATCH_TRIGGERS,
  PND_AUTO_RESPOND_RATIONALE_PREFIX,
  PND_WATCH_WORKFLOW_IDS,
  SYSTEM_SECURITY_WATCH_IDS,
} from './constants';
import { ORCHESTRATOR_STEP_IDS, PHASE_CATALOG } from './impl/lifecycle/phase_catalog';
import type { PndGateDefinition } from './impl/proposals/gate_registry';
import { PND_GATE_REGISTRY } from './impl/proposals/gate_registry';

/**
 * Cross-package drift guards between `@kbn/pnd-common` (what PND may resume, which gates exist,
 * which catalog rows a real orchestrator step backs) and `@kbn/workflows/managed` (the YAML that
 * actually runs).
 *
 * **Why the tests live here.** `@kbn/workflows` is `group: platform` and `@kbn/pnd-common` is
 * `group: security`, so `@kbn/imports/no_group_crossing_imports` forbids the managed definitions
 * from importing PND's constants. The dependency can only point this way, which is why the
 * `@kbn/workflows`-side tests (`managed/definitions/pnd/*.test.ts`) restate PND's lists locally and
 * cannot detect drift. This file imports both for real, so it can.
 */

interface GateJsonSchemaProperty {
  enum?: readonly string[];
  type?: string;
}

interface GateJsonSchema {
  properties?: Record<string, GateJsonSchemaProperty>;
  required?: readonly string[];
  type?: string;
}

interface ParsedStep {
  name: string;
  type: string;
  condition?: string;
  else?: ParsedStep[];
  steps?: ParsedStep[];
  with?: {
    schema?: GateJsonSchema;
  };
}

interface ParsedTrigger {
  type: string;
}

interface ParsedWorkflow {
  steps?: ParsedStep[];
  triggers?: ParsedTrigger[];
}

interface LocatedStep {
  /** Enclosing steps, outermost first. Empty for a step declared at the workflow's top level. */
  ancestors: readonly ParsedStep[];
  step: ParsedStep;
}

const locateSteps = (
  steps: readonly ParsedStep[] | undefined,
  ancestors: readonly ParsedStep[] = []
): LocatedStep[] =>
  (steps ?? []).flatMap((step) => [
    { ancestors, step },
    ...locateSteps(step.steps, [...ancestors, step]),
    ...locateSteps(step.else, [...ancestors, step]),
  ]);

/**
 * Renders a PND definition's YAML the way the managed-install path does.
 *
 * `yamlTemplate` rather than `yaml`: decision 7 moved every PND definition onto a template, and each
 * one ignores the values it is handed — `PND_WORKFLOW_TEMPLATE_VALUES` exists because the platform
 * refuses a templated install with missing or empty values, not because anything reads it. See the
 * comment at the top of `kbn-workflows/managed/definitions/pnd/index.ts`.
 */
const parseManagedWorkflow = (workflowId: string): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(workflowId);

  if (definition?.yamlTemplate == null) {
    throw new Error(`No managed workflow definition with a yamlTemplate for '${workflowId}'`);
  }

  return parse(definition.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)) as ParsedWorkflow;
};

const locateStep = (workflowId: string, stepName: string): LocatedStep => {
  const located = locateSteps(parseManagedWorkflow(workflowId).steps).find(
    ({ step }) => step.name === stepName
  );

  if (located == null) {
    throw new Error(`No '${stepName}' step in managed workflow '${workflowId}'`);
  }

  return located;
};

const stepNames = (steps: readonly ParsedStep[] | undefined): string[] =>
  (steps ?? []).map(({ name }) => name);

/**
 * Workstream F3. The boot-install list and the resume allow-list are two independent arrays in two
 * packages, and that separation is the whole point: `SYSTEM_SECURITY_WATCH_IDS` is what `_respond`
 * and `_auto_respond` will resume (S1). Catalog watches are dynamic and installed per-space on
 * enable/save; #283488's Detection Watch, its three rule workers, and the auto-approver are the
 * static helpers installed at boot and must never become resumable.
 *
 * `constants.test.ts` pins one of those ids by name. These tests pin the *relationship*, so a new
 * definition cannot be added to the install list and silently widen the boundary.
 */
describe('resume allow-list vs install list (F3)', () => {
  /**
   * Installed by PND, and deliberately **never** resumable: #283488's Detection Watch orchestrator
   * plus its three rule workers, plus the per-run auto-approver (kibana-tjil.6).
   *
   * They are `pluginId: 'pnd'` static definitions, so `PND_INSTALLABLE_WORKFLOW_IDS` must name them
   * or `reconcilePluginManagedWorkflows` orphan-deletes all five on the next boot. They must equally
   * stay out of {@link SYSTEM_SECURITY_WATCH_IDS}: that array is the S1 `_respond` / `_auto_respond` allow-
   * list. `system-security-rule-tuning` PATCHes production detection rules straight from YAML, which
   * is precisely what must not be reachable from a resume.
   *
   * Enumerated rather than derived, because the whole point is that a *newly* installable workflow
   * fails the accounting test below and has to be classified by hand.
   */
  const NON_RESUMABLE_INSTALLABLE_IDS = [
    MANAGED_PND_RULE_CREATION_WORKFLOW_ID,
    MANAGED_PND_RULE_PREVIEW_WORKFLOW_ID,
    MANAGED_PND_RULE_TUNING_WORKFLOW_ID,
    MANAGED_PND_WATCH_AUTO_APPROVER_WORKFLOW_ID,
    MANAGED_PND_WATCH_DETECTION_WORKFLOW_ID,
  ] as const;

  it('does not boot-install catalog watches that PND is allowed to resume', () => {
    SYSTEM_SECURITY_WATCH_IDS.forEach((watchId) => {
      expect(PND_INSTALLABLE_WORKFLOW_IDS).not.toContain(watchId);
    });
  });

  it('keeps the resume allow-list and the boot-install list disjoint', () => {
    expect(
      PND_INSTALLABLE_WORKFLOW_IDS.some((workflowId) =>
        (SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(workflowId)
      )
    ).toBe(false);
  });

  it('never admits a non-resumable installable to the resume allow-list', () => {
    NON_RESUMABLE_INSTALLABLE_IDS.forEach((workflowId) => {
      expect(SYSTEM_SECURITY_WATCH_IDS as readonly string[]).not.toContain(workflowId);
    });
  });

  it('never admits a non-resumable installable to the _respond / _auto_respond alias either', () => {
    NON_RESUMABLE_INSTALLABLE_IDS.forEach((workflowId) => {
      expect(PND_WATCH_WORKFLOW_IDS as readonly string[]).not.toContain(workflowId);
    });
  });

  // The drift catcher: a newly installable workflow must be classified as a resumable watch or as a
  // non-resumable definition PND merely installs. An unclassified addition fails here rather than
  // quietly inheriting whatever the next `startsWith` heuristic decides.
  it('accounts for every installable id as a non-resumable static helper', () => {
    expect([...PND_INSTALLABLE_WORKFLOW_IDS].sort()).toEqual(
      [...NON_RESUMABLE_INSTALLABLE_IDS].sort()
    );
  });

  it('keeps the managed catalog id list identical to the resume allow-list', () => {
    expect([...MANAGED_PND_MANAGED_WATCH_WORKFLOW_IDS]).toEqual([...SYSTEM_SECURITY_WATCH_IDS]);
  });

  /**
   * The two `PND_WATCH_WORKFLOW_IDS` — one per package, same name — were mirrors until #283488
   * widened the `@kbn/workflows/managed` one to include its Detection Watch and the three rule
   * workers. Equality is therefore the wrong assertion now; **ordered containment** is the one that
   * still means something, because the managed side is where the YAML lives and a watch that
   * disappeared from it would leave `_respond` allow-listing an id that installs nothing.
   *
   * ⛔ Do not re-tighten this to `toEqual`. The security-side list is the resume allow-list and the
   * managed-side list is not; making them equal again would either drop a watch PND installs or add
   * `system-security-rule-tuning` to the set `_respond` may resume.
   */
  it('keeps every resumable watch id on the managed side, in the same order', () => {
    expect(
      [...MANAGED_PND_WATCH_WORKFLOW_IDS].filter((workflowId) =>
        (SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(workflowId)
      )
    ).toEqual([...SYSTEM_SECURITY_WATCH_IDS]);
  });

  it.each([...PND_INSTALLABLE_WORKFLOW_IDS])(
    'resolves %s to a registered managed workflow definition',
    (workflowId) => {
      expect(getManagedWorkflowDefinition(workflowId)).toBeDefined();
    }
  );

  // Renders rather than reads: decision 7 put every PND definition on `yamlTemplate`, so asserting on
  // `yaml` here would assert `undefined` is a string and fail for all nine.
  it.each([...PND_INSTALLABLE_WORKFLOW_IDS])('installs %s from a yamlTemplate', (workflowId) => {
    expect(
      getManagedWorkflowDefinition(workflowId)?.yamlTemplate?.(PND_WORKFLOW_TEMPLATE_VALUES)
    ).toEqual(expect.any(String));
  });
});

const alwaysGates = PND_GATE_REGISTRY.filter(({ alwaysGate }) => alwaysGate);
const autoAcceptableGates = PND_GATE_REGISTRY.filter(({ alwaysGate }) => !alwaysGate);

describe('every registered gate belongs to a resumable watch', () => {
  it.each(PND_GATE_REGISTRY)('$stepId', ({ stepId, workflowId }) => {
    expect(SYSTEM_SECURITY_WATCH_IDS as readonly string[]).toContain(workflowId);

    expect(locateStep(workflowId, stepId).step.type).toBe('waitForInput');
  });
});

/**
 * kibana-tjil.2: every gate always parks. Autonomy is not a YAML branch — no `read_autonomy`,
 * no `autoAccept` condition, no retired autonomy-skip marker step. Autonomy is enforced
 * server-side at approval time from `autoApproveResponse`.
 *
 * ⚠️ `await_promote_incident` still has an `if` ancestor (`assess_investigation`, the isIncident
 * verdict). That is a real branch, not an autonomy skip. Do not assert "no `if` ancestor at any
 * depth" for every gate.
 */
describe.each(PND_GATE_REGISTRY)(
  '$stepId (always parks; autonomy is not a YAML branch)',
  (gate) => {
    const located = locateStep(gate.workflowId, gate.stepId);
    const stepIds = locateSteps(parseManagedWorkflow(gate.workflowId).steps).map(
      ({ step }) => step.name
    );

    it('is a waitForInput', () => {
      expect(located.step.type).toBe('waitForInput');
    });

    it('has no autonomy if ancestor', () => {
      expect(
        located.ancestors.filter(
          (ancestor) =>
            ancestor.condition?.includes('autoAccept') === true ||
            ancestor.condition?.includes('read_autonomy') === true
        )
      ).toEqual([]);
    });

    it('declares no read_autonomy step in this watch', () => {
      expect(stepIds).not.toContain('read_autonomy');
    });
  }
);

/**
 * ⛔ ADR-005 / S8, asserted structurally rather than by comment, and driven by the registry so a
 * future fifth gate is covered the day it is added.
 *
 * An `alwaysGate` gate is one no autonomy level may ever bypass (`resolveAutoAcceptableGates`
 * excludes them at supervised, and `_auto_respond` refuses them outright). The YAML half of that
 * guarantee is the *absence* of an enclosing `if`: give `await_apply_tuning` one and "the
 * tuning suggestion always comes as a HITL prompt" stops being true, while every unit test of
 * the registry keeps passing.
 */
describe.each(alwaysGates)('$stepId (alwaysGate, can never auto-accept)', (gate) => {
  const located = locateStep(gate.workflowId, gate.stepId);

  it('is declared at the workflow top level, so nothing can gate it', () => {
    expect(stepNames(parseManagedWorkflow(gate.workflowId).steps)).toContain(gate.stepId);
  });

  it('has no enclosing step at all, at any depth', () => {
    expect(located.ancestors).toHaveLength(0);
  });

  it('has no autoApproveResponse, because it is never auto-approved', () => {
    expect(gate.autoApproveResponse).toBeUndefined();
  });
});

/**
 * The engine never validates `resumeInput`, and `with.schema`'s `default` is inert
 * (`applyInputDefaults` runs only for workflow inputs). This is the only check that will
 * catch payload / schema drift. `.4` builds the live payload from `autoApproveResponse`
 * plus the auto-respond rationale prefix.
 */
const composeAutoApprovePayload = (
  autoApproveResponse: NonNullable<PndGateDefinition['autoApproveResponse']>
): Record<string, string> => ({
  ...autoApproveResponse,
  rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (auto)`,
});

describe.each(autoAcceptableGates)('$stepId (auto-approvable)', (gate) => {
  const located = locateStep(gate.workflowId, gate.stepId);
  const schema = located.step.with?.schema;

  it('declares autoApproveResponse', () => {
    expect(gate.autoApproveResponse).toEqual({ decision: 'approve' });
  });

  it('declares an object with.schema so the payload can be checked', () => {
    expect(schema?.type).toBe('object');
  });

  it('composes a payload that includes every required schema key', () => {
    const autoApproveResponse = gate.autoApproveResponse;

    if (autoApproveResponse == null) {
      throw new Error(`autoApproveResponse is missing on ${gate.stepId}`);
    }

    const payload = composeAutoApprovePayload(autoApproveResponse);

    expect(schema?.required?.length).toBeGreaterThan(0);

    (schema?.required ?? []).forEach((key) => {
      expect(payload).toHaveProperty(key);
    });
  });

  it('composes a payload whose enum values are members of the schema', () => {
    const autoApproveResponse = gate.autoApproveResponse;

    if (autoApproveResponse == null) {
      throw new Error(`autoApproveResponse is missing on ${gate.stepId}`);
    }

    const payload = composeAutoApprovePayload(autoApproveResponse);

    Object.entries(schema?.properties ?? {}).forEach(([key, property]) => {
      if (!(key in payload) || property.enum == null) {
        return;
      }

      expect(property.enum).toContain(payload[key]);
    });
  });
});

/**
 * Workstream F4, for the **live** rows — and the guard that was missing.
 *
 * A `live` row claims a real orchestrator step ran, and the projection resolves its status and its
 * step-level deep link by matching `orchestratorStepId` against the step executions of a correlated
 * watch run. If the catalog names a step no YAML declares, the match can never succeed: the row
 * renders `not_started` with no link **forever**, including on a fully completed loop, which is
 * indistinguishable from "not yet reached" — the same class of defect workstream C set out to remove.
 *
 * That is exactly what happened to 4.4 "Apply tuning". It pointed at `apply_tuning`, a step B6-yaml
 * deliberately deleted when the rule write moved into the PND UI, and nothing noticed: every unit
 * test of the projection *fabricates* a step execution bearing the catalog's own id, so the two
 * agreed with each other while both disagreed with the YAML. Only reading the real definitions can
 * catch it.
 */
describe('managed watch steps back every live catalog row', () => {
  const watchStepNames = new Set(
    SYSTEM_SECURITY_WATCH_IDS.flatMap((workflowId) =>
      locateSteps(parseManagedWorkflow(workflowId).steps).map(({ step }) => step.name)
    )
  );

  const liveRows = PHASE_CATALOG.filter(({ liveness }) => liveness === 'live');

  it('has a live row for every phase, so no phase is projection-blind', () => {
    expect(new Set(liveRows.map(({ phase }) => phase)).size).toBe(4);
  });

  it('gives every live row an orchestratorStepId to correlate on', () => {
    expect(liveRows.filter(({ orchestratorStepId }) => orchestratorStepId == null)).toEqual([]);
  });

  it.each(liveRows.map(({ id, orchestratorStepId }) => [id, orchestratorStepId]))(
    '%s correlates on a step the managed YAML really declares (%s)',
    (_id, orchestratorStepId) => {
      expect([...watchStepNames]).toContain(orchestratorStepId);
    }
  );

  // The inverse of the 4.4 regression, stated as its own assertion so the reason survives: a step
  // the watches no longer declare must not linger in the catalog's id table either.
  it('names no orchestrator step that no watch declares', () => {
    expect(
      Object.values(ORCHESTRATOR_STEP_IDS).filter((stepId) => !watchStepNames.has(stepId))
    ).toEqual([]);
  });
});

/**
 * `PND_SIGNAL_DRIVEN_WATCH_TRIGGERS` decides which watch's settings page replaces the Frequency
 * select with a "Signal-driven" explanation (2026-08-17 Watch-settings simplification, bead
 * kibana-phf4.27). That is a UI claim about runtime behaviour, so it is only true while the YAML
 * agrees, and nothing in the plugin can check it: `@kbn/workflows` is `group: platform`, so the
 * definitions cannot import this map, and the plugin does not parse YAML. This file imports both.
 *
 * Asserted in **both** directions on purpose. A map entry for a watch that in fact polls would tell a
 * customer their watch is signal-driven when a frequency still governs it; a missing entry would show
 * a Frequency select on a watch where changing it does nothing at all. Both are silent.
 */
describe('signal-driven watches match the triggers their YAML declares', () => {
  const triggerTypesOf = (workflowId: string): string[] =>
    (parseManagedWorkflow(workflowId).triggers ?? []).map(({ type }) => type);

  const signalDrivenEntries = Object.entries(PND_SIGNAL_DRIVEN_WATCH_TRIGGERS);

  it('maps at least one watch, so neither direction below passes vacuously', () => {
    expect(signalDrivenEntries.length).toBeGreaterThan(0);
  });

  it.each(signalDrivenEntries)('%s really subscribes to %s', (workflowId, triggerId) => {
    expect(triggerTypesOf(workflowId)).toContain(triggerId);
  });

  // The inverse: a watch the YAML drives by one of these signals must be in the map, or its settings
  // page keeps offering a Frequency select that governs nothing.
  it.each([...new Set(Object.values(PND_SIGNAL_DRIVEN_WATCH_TRIGGERS))])(
    'names every watch driven by %s',
    (triggerId) => {
      const declaring = SYSTEM_SECURITY_WATCH_IDS.filter((workflowId) =>
        triggerTypesOf(workflowId).includes(triggerId)
      );
      const mapped = signalDrivenEntries
        .filter(([, mappedTriggerId]) => mappedTriggerId === triggerId)
        .map(([workflowId]) => workflowId);

      expect([...declaring].sort()).toEqual([...mapped].sort());
    }
  );
});
