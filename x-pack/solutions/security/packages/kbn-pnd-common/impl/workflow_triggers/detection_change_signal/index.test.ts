/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import {
  DetectionChangeSignalEventSchema,
  DetectionChangeSignalEvidenceRefSchema,
  detectionChangeSignalTriggerCommonDefinition,
} from '.';

/** The minimum a producer must supply: every required field, nothing optional. */
const minimalEvent = {
  evidenceRefs: [{ id: 'ad-1', kind: 'attack_discovery' }],
  gapDescription: 'Privilege escalation via a service account was not covered by any rule.',
  sourceRunId: 'run-1',
  sourceWatchId: 'system-security-watch-floor',
  spaceId: 'default',
  tactics: ['Privilege Escalation'],
};

/** The tuning branch (`ruleRef`) with every optional field populated. */
const fullEvent = {
  ...minimalEvent,
  confidence: 0.75,
  dataSources: ['logs-endpoint.events.*'],
  evidenceRefs: [
    { id: 'ad-1', kind: 'attack_discovery' },
    { id: 'conv-1', kind: 'conversation' },
  ],
  recurrenceCount: 12,
  ruleRef: 'rule-1',
  technique: 'T1068',
};

const repeat = (length: number) => 'a'.repeat(length);

describe('detectionChangeSignalTriggerCommonDefinition', () => {
  it('uses the shared security.detectionChangeSignal trigger id', () => {
    expect(detectionChangeSignalTriggerCommonDefinition.id).toEqual(
      PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID
    );
  });

  it('is namespaced to security rather than to pnd, because any watch may produce one', () => {
    expect(detectionChangeSignalTriggerCommonDefinition.id).toEqual(
      'security.detectionChangeSignal'
    );
  });

  it('exposes the detection-change-signal event schema', () => {
    expect(detectionChangeSignalTriggerCommonDefinition.eventSchema).toBe(
      DetectionChangeSignalEventSchema
    );
  });

  it('declares a stability level', () => {
    expect(detectionChangeSignalTriggerCommonDefinition.stability).toEqual('tech_preview');
  });

  it('documents the trigger with at least one YAML example', () => {
    expect(
      detectionChangeSignalTriggerCommonDefinition.documentation?.examples?.length
    ).toBeGreaterThan(0);
  });
});

describe('DetectionChangeSignalEventSchema', () => {
  it('accepts an event carrying only the required fields', () => {
    expect(DetectionChangeSignalEventSchema.safeParse(minimalEvent).success).toBe(true);
  });

  it('accepts an event carrying every optional field', () => {
    expect(DetectionChangeSignalEventSchema.safeParse(fullEvent).success).toBe(true);
  });

  it('rejects unknown fields (no information disclosure through the event, S6)', () => {
    expect(
      DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, alertBody: 'secret' }).success
    ).toBe(false);
  });

  it('rejects the engine-injected timestamp, which the emitter must not supply', () => {
    expect(
      DetectionChangeSignalEventSchema.safeParse({
        ...minimalEvent,
        timestamp: '2026-08-13T00:00:00.000Z',
      }).success
    ).toBe(false);
  });

  describe('sourceWatchId', () => {
    it('is required', () => {
      const { sourceWatchId, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses a blank value', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, sourceWatchId: '' }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          sourceWatchId: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH),
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          sourceWatchId: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('sourceRunId', () => {
    it('is required', () => {
      const { sourceRunId, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses a blank value', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, sourceRunId: '' }).success
      ).toBe(false);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          sourceRunId: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('spaceId', () => {
    it('is required', () => {
      const { spaceId, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses a blank value', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, spaceId: '' }).success
      ).toBe(false);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          spaceId: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('gapDescription', () => {
    it('is required', () => {
      const { gapDescription, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses a blank value', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, gapDescription: '' }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH} characters, the gate rationale bound it is derived from`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          gapDescription: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH),
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH + 1} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          gapDescription: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('tactics', () => {
    it('is required, so a consumer never has to test for the key', () => {
      const { tactics, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('permits an empty array, because AD 2.0 types mitre_attack_tactics as optional', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, tactics: [] }).success
      ).toBe(true);
    });

    it('refuses a blank member', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, tactics: [''] }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS} members`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          tactics: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS).fill('Persistence'),
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS + 1} members`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          tactics: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS + 1).fill('Persistence'),
        }).success
      ).toBe(false);
    });

    it(`refuses a member longer than ${PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          tactics: [repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH + 1)],
        }).success
      ).toBe(false);
    });
  });

  describe('technique', () => {
    it('is optional, because Attack Discovery carries tactics and no technique id', () => {
      const { technique, ...rest } = fullEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(true);
    });

    it('refuses a blank value when present', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, technique: '' }).success
      ).toBe(false);
    });

    it(`refuses more than ${PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          technique: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('ruleRef', () => {
    it('is optional, because the creation branch has no rule yet', () => {
      const { ruleRef, ...rest } = fullEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(true);
    });

    it('refuses a blank value when present', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, ruleRef: '' }).success
      ).toBe(false);
    });

    it(`refuses more than ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          ruleRef: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });

  describe('confidence', () => {
    it('is optional, so containment omits it rather than inventing one', () => {
      const { confidence, ...rest } = fullEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(true);
    });

    it('accepts 0', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, confidence: 0 }).success
      ).toBe(true);
    });

    it('accepts 1', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, confidence: 1 }).success
      ).toBe(true);
    });

    it('refuses a value above 1', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, confidence: 1.01 }).success
      ).toBe(false);
    });

    it('refuses a negative value', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, confidence: -0.01 }).success
      ).toBe(false);
    });
  });

  describe('recurrenceCount', () => {
    it('is optional ("where applicable")', () => {
      const { recurrenceCount, ...rest } = fullEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(true);
    });

    it('refuses a fractional count', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, recurrenceCount: 1.5 })
          .success
      ).toBe(false);
    });

    it('refuses a negative count', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, recurrenceCount: -1 }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT}`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          recurrenceCount: PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT,
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT + 1}`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          recurrenceCount: PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT + 1,
        }).success
      ).toBe(false);
    });
  });

  describe('dataSources', () => {
    it('is optional', () => {
      const { dataSources, ...rest } = fullEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(true);
    });

    it('refuses a blank member', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, dataSources: [''] }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES} members`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          dataSources: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES).fill('logs-*'),
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES + 1} members`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          dataSources: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES + 1).fill('logs-*'),
        }).success
      ).toBe(false);
    });

    it(`refuses a member longer than ${PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH} characters`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          dataSources: [repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH + 1)],
        }).success
      ).toBe(false);
    });
  });

  describe('evidenceRefs', () => {
    it('is required', () => {
      const { evidenceRefs, ...rest } = minimalEvent;
      expect(DetectionChangeSignalEventSchema.safeParse(rest).success).toBe(false);
    });

    it('refuses an empty array, because an untraceable claim is not reviewable', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({ ...minimalEvent, evidenceRefs: [] }).success
      ).toBe(false);
    });

    it(`accepts ${PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS} refs`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          evidenceRefs: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS).fill({
            id: 'alert-1',
            kind: 'alert',
          }),
        }).success
      ).toBe(true);
    });

    it(`refuses ${PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS + 1} refs`, () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          evidenceRefs: new Array(PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS + 1).fill({
            id: 'alert-1',
            kind: 'alert',
          }),
        }).success
      ).toBe(false);
    });

    it('refuses inline evidence text smuggled onto a ref', () => {
      expect(
        DetectionChangeSignalEventSchema.safeParse({
          ...minimalEvent,
          evidenceRefs: [{ id: 'ad-1', kind: 'attack_discovery', summary: 'secret' }],
        }).success
      ).toBe(false);
    });
  });
});

describe('DetectionChangeSignalEvidenceRefSchema', () => {
  it.each(PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS)('accepts the %s kind', (kind) => {
    expect(DetectionChangeSignalEvidenceRefSchema.safeParse({ id: 'x', kind }).success).toBe(true);
  });

  it('refuses an unlisted kind, so a producer cannot invent one', () => {
    expect(
      DetectionChangeSignalEvidenceRefSchema.safeParse({ id: 'x', kind: 'attack_discovery_alert' })
        .success
    ).toBe(false);
  });

  it('carries no Attack-Discovery-shaped field, so Dark Watch adoption stays additive', () => {
    expect(Object.keys(DetectionChangeSignalEvidenceRefSchema.shape)).toEqual(['id', 'kind']);
  });

  it('refuses a blank id', () => {
    expect(
      DetectionChangeSignalEvidenceRefSchema.safeParse({ id: '', kind: 'alert' }).success
    ).toBe(false);
  });

  it(`refuses an id longer than ${PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH} characters`, () => {
    expect(
      DetectionChangeSignalEvidenceRefSchema.safeParse({
        id: repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH + 1),
        kind: 'alert',
      }).success
    ).toBe(false);
  });
});
