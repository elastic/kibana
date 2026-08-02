/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import {
  PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS,
  PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES,
  PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS,
  PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT,
  PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
} from '../../../constants';

/**
 * One traceable artifact behind a Detection Change Signal.
 *
 * A `{ kind, id }` pair rather than a typed field per producer. The name is prefixed because
 * `@kbn/pnd-common` already exports an unrelated `EvidenceRef` (the investigation-surface ref, which
 * carries display `label` / `url`); this one is a wire contract with no presentation in it.
 */
export const DetectionChangeSignalEvidenceRefSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH)
      .describe('Identifier of the referenced artifact, resolved by the consumer as the caller'),
    kind: z
      .enum(PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS)
      .describe('What sort of artifact `id` addresses'),
  })
  .strict();

export type DetectionChangeSignalEvidenceRef = z.infer<
  typeof DetectionChangeSignalEvidenceRefSchema
>;

/**
 * Payload contract for `security.detectionChangeSignal` — *"there is a coverage gap here"*.
 *
 * Cross-watch by construction: Watch Floor, Dark Watch, Watch Officer and Deep Watch all fit this
 * envelope, and one signal covers both downstream branches — **`ruleRef` present means tuning an
 * existing rule, `technique` present means creating one**.
 *
 * Three properties of the shape are load-bearing and must not be "tidied":
 *
 * 1. **`evidenceRefs` is a generic kinded array**, never an Attack-Discovery-shaped field. An
 *    optional field can be added later without breaking a consumer; a field's *shape* cannot. Dark
 *    Watch's evidence is hunt findings with no Attack Discovery in its path.
 * 2. **`tactics` is required and `technique` is optional**, because AD 2.0 carries
 *    `mitre_attack_tactics` (TA-level) and no technique id, while a creation lane wants a technique.
 *    Naming that asymmetry is the difference between a contract and a guess.
 * 3. **`confidence` and `recurrenceCount` are optional and omitted rather than invented.** The
 *    daybreak spec asks for them "where applicable"; there is no measured confidence at containment.
 *
 * `.strict()` makes the schema **reject** unknown fields rather than strip them, so a future emit
 * site cannot leak an extra property through the event (security finding S6). Every string and every
 * array is bounded, and each bound is a named constant in `constants.ts` pinned by a test.
 *
 * ⚠️ The engine validates the **emitter's raw payload**, not the enriched event
 * (`trigger_event_handler.ts` calls `validateTrigger(triggerId, spaceId, payload)` *before* building
 * `eventContextForResolution`), so `timestamp` / `eventChainDepth` are deliberately absent here even
 * though `event.timestamp` is readable from a trigger condition. Declaring them would only let an
 * emitter supply its own.
 */
export const DetectionChangeSignalEventSchema = z
  .object({
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Producer confidence in the gap claim, 0..1. Omitted when unmeasured — never invented.'
      ),
    dataSources: z
      .array(z.string().min(1).max(PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH))
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES)
      .optional()
      .describe(
        'Index patterns or integrations the proposed detection needs. Read by a Rule Creation lane.'
      ),
    evidenceRefs: z
      .array(DetectionChangeSignalEvidenceRefSchema)
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS)
      .describe(
        'Refs to the artifacts behind the claim. Refs, never inline evidence: the consumer fetches the narrative as the caller (D7).'
      ),
    gapDescription: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH)
      .describe(
        'What coverage is missing, in prose. No alert field values, no host or user names — the event index has weaker authorization than the alerts index (S6).'
      ),
    recurrenceCount: z
      .number()
      .int()
      .min(0)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT)
      .optional()
      .describe('How many times the producer observed the pattern in its window, where applicable'),
    ruleRef: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH)
      .optional()
      .describe(
        'Detection rule the gap is about. Present means the tuning branch; absent means creation.'
      ),
    sourceRunId: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH)
      .describe('Workflow execution id of the run that produced the claim'),
    sourceWatchId: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH)
      .describe(
        'Managed watch workflow id of the producer. A subscriber allow-lists this in its trigger condition, which is fail-closed because KQL yields false for a missing value.'
      ),
    spaceId: z.string().min(1).max(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH).describe(
      // The engine resolves the space from the emitting request; this field is the producer's own
      // record of it, which is what makes the persisted event self-describing.
      'Kibana space the claim was produced in'
    ),
    tactics: z
      .array(z.string().min(1).max(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH))
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS)
      .describe(
        'MITRE ATT&CK tactics the gap sits in. Required so a consumer never has to test for the key, but permitted to be empty: AD 2.0 types `mitre_attack_tactics` as optional, and inventing a tactic to satisfy a schema is the failure mode `confidence` is optional to avoid.'
      ),
    technique: z
      .string()
      .min(1)
      .max(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH)
      .optional()
      .describe(
        'MITRE ATT&CK technique. Documented as ABSENT from Attack Discovery, which carries tactics only; hunt-style producers supply it.'
      ),
  })
  .strict();

export type DetectionChangeSignalEvent = z.infer<typeof DetectionChangeSignalEventSchema>;

/**
 * `security.detectionChangeSignal` trigger definition.
 *
 * Registered by the PND server in `setup`, gated on `config.enabled` rather than on a feature flag:
 * trigger registration is setup-only and synchronous and flags are unreadable there, which is the
 * same reason `security.attackDiscoveryCreated` does it that way.
 *
 * PND emits it from `_respond` at every Floor HITL terminal and from
 * `POST /internal/pnd/signals/_detection_change` on the Floor's not-an-incident branch,
 * beside — and independently of — `pnd.incidentClosed` (containment approval only).
 * `system-security-watch-post-incident` subscribes to it with a `sourceWatchId` allow-list
 * of the producer watches (see the allow-list example below).
 */
export const detectionChangeSignalTriggerCommonDefinition: CommonTriggerDefinition<
  typeof DetectionChangeSignalEventSchema
> = {
  id: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: DetectionChangeSignalEventSchema,
  title: i18n.translate('xpack.pnd.workflowTriggers.detectionChangeSignal.title', {
    defaultMessage: 'Detection change signal',
  }),
  description: i18n.translate('xpack.pnd.workflowTriggers.detectionChangeSignal.description', {
    defaultMessage:
      'Emitted when a watch concludes that detection coverage is missing or mistuned. Carries a bounded gap description plus refs to the evidence, never the evidence itself.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.pnd.workflowTriggers.detectionChangeSignal.documentation.details',
      {
        defaultMessage:
          'A coverage claim, deliberately separate from the "pnd.incidentClosed" lifecycle fact. One envelope serves two branches: "event.ruleRef" present means an existing rule should be tuned, "event.technique" present means a rule should be created. The payload carries ids, ATT&CK labels, an optional confidence and recurrence count, and "event.evidenceRefs" — kinded refs the subscriber resolves as the calling user. It deliberately excludes alert bodies, host and user names, and any narrative beyond "event.gapDescription".',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.pnd.workflowTriggers.detectionChangeSignal.documentation.exampleAllowListProducers',
        {
          defaultMessage: `## Only accept signals from known producers
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.sourceWatchId: ("system-security-watch-floor" or "system-security-watch-dark")'
\`\`\`
An allow-list is already fail-closed here: KQL yields false for a missing or unexpected value, and a
condition that does not match means the workflow does not run. Never write it as a negated
deny-list — that fails open for every producer you did not think of.`,
          values: { triggerId: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'xpack.pnd.workflowTriggers.detectionChangeSignal.documentation.exampleTuningBranch',
        {
          defaultMessage: `## Take only the tuning branch, not the creation branch
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.ruleRef: *'
\`\`\``,
          values: { triggerId: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID },
        }
      ),
    ],
  },
};
