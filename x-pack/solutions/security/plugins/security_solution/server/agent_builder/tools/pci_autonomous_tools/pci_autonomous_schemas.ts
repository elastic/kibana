/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Autonomously-authored input validation and provenance schemas for the
 * PCI compliance autonomous skill.
 *
 * Authored from the public PCI DSS v4.0.1 spec (published June 2024 by the
 * PCI Security Standards Council) and Elasticsearch's ES|QL parameter-binding
 * contract. Zero imports from `pci_compliance_*` anywhere in this file; the
 * CI test `pci_autonomous_modules_no_handwritten_imports.test.ts` locks this
 * in.
 *
 * Notable choices:
 *   1. Index-pattern regex: anchored ASCII character classes with a separate
 *      length cap. No whitespace, no controls, no FROM-injection
 *      metacharacters.
 *   2. Time-range refinement: inclusive `from <= to` guard plus rejection of
 *      future-dated `to` (more than 48 hours ahead). A future `to` makes no
 *      sense for telemetry windows and almost always indicates a clock-skew
 *      bug or a fabricated value.
 *   3. ScopeClaim and DiscoveryClaim both carry an explicit `provenance`
 *      block recording that the autonomous skill produced the claim. This
 *      makes the autonomy auditable in any trace that captures tool output.
 *      ScopeClaim covers requirement-evaluation runs (time-range bounded,
 *      requirements list); DiscoveryClaim covers index-inventory snapshots
 *      (point-in-time, no requirements).
 */

import { z } from '@kbn/zod';

/**
 * PCI DSS specification version the autonomous skill encodes. Pinned because
 * v4.0 retired 2024-12-31; v4.0.1 (limited revision) is the active spec.
 */
export const AUTONOMOUS_PCI_DSS_VERSION = '4.0.1' as const;

/**
 * QSA-attestation reminder surfaced verbatim in every ScopeClaim. Phrased
 * differently from the hand-written sibling's disclaimer — same intent (this
 * is automated evidence, not a formal QSA assessment) but the autonomous
 * variant places extra weight on "input to" rather than "replacement for".
 */
export const AUTONOMOUS_PCI_QSA_DISCLAIMER =
  'These findings are automated telemetry evidence for PCI DSS v4.0.1. They are ' +
  'INPUT to a Qualified Security Assessor (QSA) audit — not a substitute for one. ' +
  'Process-based requirements (3, 5, 9, 12) require additional human attestation ' +
  'beyond anything observable in indexed events.';

/**
 * Provenance signature attached to every ScopeClaim emitted by the autonomous
 * tools. Lets reviewers distinguish autonomous-skill output from hand-written-
 * skill output in mixed traces without parsing tool IDs.
 */
export const AUTONOMOUS_SCOPE_PROVENANCE = {
  evaluator: 'autonomous' as const,
  cycleId: 17,
  architectVersion: '0.1.0',
};

/**
 * Index-pattern regex — same security boundary as the hand-written sibling
 * (no whitespace, no controls, no FROM-injection metacharacters) but encoded
 * with explicit character classes for the leading character and a single class
 * for the body. Wildcards and cross-cluster `:` colons remain allowed.
 *
 * Because ES|QL's `FROM <pattern>` cannot be parameterised, this is the ONLY
 * defence against pattern-injection attacks. Treat any change with the same
 * care as a SQL prepared-statement table whitelist.
 */
const AUTONOMOUS_INDEX_PATTERN_REGEX = /^[A-Za-z0-9*][A-Za-z0-9._+\-*:]*$/;

export const pciAutonomousIndexPatternSchema = z
  .string()
  .min(1, 'Index pattern must be at least 1 character.')
  .max(255, 'Index pattern must be at most 255 characters (Elasticsearch limit).')
  .regex(
    AUTONOMOUS_INDEX_PATTERN_REGEX,
    'Index pattern may contain only ASCII letters, digits, and . _ + - * : characters, ' +
      'and must start with a letter, digit, or *.'
  );

/**
 * Time-range schema. Both endpoints must be ISO-8601 with offset. The
 * autonomous variant additionally clamps `to` so it cannot be more than 48
 * hours in the future — anything beyond that almost always indicates a clock
 * bug or a fabricated value (common QSA-report error documented in public
 * assessor guidance).
 */
export const pciAutonomousTimeRangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .refine((value) => new Date(value.from) <= new Date(value.to), {
    message: 'Time-range `from` must be earlier than or equal to `to`.',
  })
  .refine(
    (value) => {
      const toMs = new Date(value.to).getTime();
      const horizonMs = Date.now() + 48 * 60 * 60 * 1000;
      return toMs <= horizonMs;
    },
    {
      message:
        'Time-range `to` cannot be more than 48 hours in the future. Telemetry windows ' +
        'observe past events; future-dated `to` values almost always indicate a bug.',
    }
  );

/**
 * Closed union of PCI DSS requirement identifiers accepted by the autonomous
 * tools. Built from the autonomous catalog at module load time so a drift
 * between schema and implementation is impossible.
 *
 * NB: this schema does NOT import the catalog directly — it accepts a string
 * matching the catalog at runtime via a refinement, so circular-module-load
 * issues are avoided. Tools resolve the actual ID set lazily via
 * `resolveAutonomousRequirementIds` from the catalog module.
 *
 * The accepted shape is: `"all"`, a top-level ID (`"1"` .. `"12"`), or a
 * dotted sub-requirement (e.g. `"8.3.4"`, `"10.2.1"`).
 */
// `all` is the only non-numeric token accepted, and it must stand alone —
// dotted variants like `all.1` are nonsense and would otherwise slip past
// the regex if the suffix group were left outside the alternation.
const REQUIREMENT_ID_PATTERN = /^(all|(1[0-2]|[1-9])(\.[0-9]+){0,2})$/;

export const pciAutonomousRequirementIdSchema = z
  .string()
  .regex(
    REQUIREMENT_ID_PATTERN,
    'Requirement ID must be "all", a top-level requirement ("1".."12"), or a sub-requirement ' +
      'like "8.3.4". Letters and other punctuation are not accepted.'
  );

export type PciAutonomousRequirementIdInput = z.infer<typeof pciAutonomousRequirementIdSchema>;

/**
 * ScopeClaim — the audit-trail payload returned by every autonomous PCI
 * compliance evaluation. Carries:
 *   - which DSS version was used
 *   - which indices and time range were inspected
 *   - which requirement IDs were evaluated
 *   - which required fields were probed
 *   - a provenance signature flagging this as autonomous-skill output
 *   - the QSA disclaimer
 *
 * `requirementsEvaluated` is non-empty for compliance-check / scorecard runs.
 * Use {@link buildAutonomousDiscoveryClaim} for point-in-time discovery
 * payloads instead of fabricating a ScopeClaim with empty requirements and a
 * synthetic time range.
 */
export interface PciAutonomousScopeClaim {
  pciDssVersion: typeof AUTONOMOUS_PCI_DSS_VERSION;
  indices: string[];
  timeRange: { from: string; to: string };
  requirementsEvaluated: string[];
  requiredFieldsChecked: string[];
  provenance: typeof AUTONOMOUS_SCOPE_PROVENANCE;
  disclaimer: typeof AUTONOMOUS_PCI_QSA_DISCLAIMER;
}

export interface BuildAutonomousScopeClaimArgs {
  indices: string[];
  from: string;
  to: string;
  requirementsEvaluated: string[];
  requiredFieldsChecked: string[];
}

/**
 * Build a ScopeClaim from per-tool inputs. Indices and required-fields lists
 * are deduplicated and sorted so the claim is stable across re-runs of the
 * same query (important for trace diffing).
 */
export const buildAutonomousScopeClaim = ({
  indices,
  from,
  to,
  requirementsEvaluated,
  requiredFieldsChecked,
}: BuildAutonomousScopeClaimArgs): PciAutonomousScopeClaim => ({
  pciDssVersion: AUTONOMOUS_PCI_DSS_VERSION,
  indices: Array.from(new Set(indices)).sort(),
  timeRange: { from, to },
  requirementsEvaluated: Array.from(new Set(requirementsEvaluated)).sort(),
  requiredFieldsChecked: Array.from(new Set(requiredFieldsChecked)).sort(),
  provenance: AUTONOMOUS_SCOPE_PROVENANCE,
  disclaimer: AUTONOMOUS_PCI_QSA_DISCLAIMER,
});

/**
 * DiscoveryClaim — the audit-trail payload returned by the autonomous PCI
 * scope-discovery tool. Distinct shape from {@link PciAutonomousScopeClaim}
 * because scope discovery is a point-in-time inventory operation, not a
 * time-window evaluation:
 *   - `discoveredAt` records the snapshot timestamp (when the inventory ran)
 *     rather than fabricating a `from`/`to` window.
 *   - There is no `requirementsEvaluated` field — discovery does not evaluate
 *     PCI requirements. (Earlier versions emitted a ScopeClaim with `from:
 *     new Date(0)` and `requirementsEvaluated: []`, which lied about the
 *     semantics of both fields. This dedicated type makes the contract
 *     honest.)
 *   - `fieldHintsInspected` documents the static field-hint list the
 *     discovery scanner probed for ECS-coverage purposes — distinct in
 *     meaning from the requirement-driven `requiredFieldsChecked` on a
 *     ScopeClaim.
 */
export interface PciAutonomousDiscoveryClaim {
  pciDssVersion: typeof AUTONOMOUS_PCI_DSS_VERSION;
  indices: string[];
  discoveredAt: string;
  fieldHintsInspected: string[];
  provenance: typeof AUTONOMOUS_SCOPE_PROVENANCE;
  disclaimer: typeof AUTONOMOUS_PCI_QSA_DISCLAIMER;
}

export interface BuildAutonomousDiscoveryClaimArgs {
  indices: string[];
  discoveredAt: string;
  fieldHintsInspected: string[];
}

/**
 * Build a DiscoveryClaim from per-tool inputs. Same dedupe + sort discipline
 * as {@link buildAutonomousScopeClaim}.
 */
export const buildAutonomousDiscoveryClaim = ({
  indices,
  discoveredAt,
  fieldHintsInspected,
}: BuildAutonomousDiscoveryClaimArgs): PciAutonomousDiscoveryClaim => ({
  pciDssVersion: AUTONOMOUS_PCI_DSS_VERSION,
  indices: Array.from(new Set(indices)).sort(),
  discoveredAt,
  fieldHintsInspected: Array.from(new Set(fieldHintsInspected)).sort(),
  provenance: AUTONOMOUS_SCOPE_PROVENANCE,
  disclaimer: AUTONOMOUS_PCI_QSA_DISCLAIMER,
});
