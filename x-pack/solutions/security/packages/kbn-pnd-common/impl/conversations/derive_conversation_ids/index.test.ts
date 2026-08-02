/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5, validate as uuidValidate } from 'uuid';

import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
} from '../../../constants';
import { PND_GATE_IDS, PND_GATE_REGISTRY } from '../../proposals/gate_registry';
import {
  PND_INCIDENT_NAMESPACE,
  PND_INVESTIGATION_NAMESPACE,
  PND_THREAD_NAMESPACE,
  PND_TUNING_NAMESPACE,
  PND_WORKER_NAMESPACE,
  PND_WORKER_WORKFLOW_IDS,
  deriveAllThreadConversationIds,
  deriveAllWorkerConversationIds,
  deriveConversationIds,
  deriveThreadConversationId,
  deriveWorkerConversationId,
  getPndConversationKind,
} from '.';

const AD_ALERT_ID = 'ad-alert-8f2c1e4a';

describe('deriveConversationIds', () => {
  it('derives an investigation id that is a valid UUID', () => {
    expect(uuidValidate(deriveConversationIds(AD_ALERT_ID).investigationConversationId)).toBe(true);
  });

  it('derives an incident id that is a valid UUID', () => {
    expect(uuidValidate(deriveConversationIds(AD_ALERT_ID).incidentConversationId)).toBe(true);
  });

  it('derives a tuning id that is a valid UUID', () => {
    expect(uuidValidate(deriveConversationIds(AD_ALERT_ID).tuningConversationId)).toBe(true);
  });

  it('is deterministic for the same alert id', () => {
    expect(deriveConversationIds(AD_ALERT_ID)).toEqual(deriveConversationIds(AD_ALERT_ID));
  });

  it('derives distinct ids for the three namespaces', () => {
    const { incidentConversationId, investigationConversationId, tuningConversationId } =
      deriveConversationIds(AD_ALERT_ID);

    expect(
      new Set([incidentConversationId, investigationConversationId, tuningConversationId]).size
    ).toBe(3);
  });

  it('derives different ids for different alert ids', () => {
    expect(deriveConversationIds(AD_ALERT_ID).investigationConversationId).not.toBe(
      deriveConversationIds('ad-alert-other').investigationConversationId
    );
  });

  it('uses fixed, distinct namespace constants', () => {
    expect(
      new Set([PND_INVESTIGATION_NAMESPACE, PND_INCIDENT_NAMESPACE, PND_TUNING_NAMESPACE]).size
    ).toBe(3);
  });
});

/**
 * The three namespaces are fixed forever: changing one silently repoints every conversation
 * to a new id, orphaning existing threads. These pinned values are the regression guard —
 * in particular they prove that adding {@link PND_TUNING_NAMESPACE} left the two pre-existing
 * ids byte-for-byte unchanged.
 */
describe('deriveConversationIds (pinned ids — the namespaces are fixed forever)', () => {
  it('pins the namespace constants themselves', () => {
    expect({
      incident: PND_INCIDENT_NAMESPACE,
      investigation: PND_INVESTIGATION_NAMESPACE,
      tuning: PND_TUNING_NAMESPACE,
    }).toEqual({
      incident: 'b2e5d3f9-7c4e-4a0b-9d8f-3e6c0a1b2d45',
      investigation: 'a1f4c2e8-6b3d-4f9a-8c7e-2d5b9f0a1c34',
      tuning: 'c3f6e4a0-8d5f-4b1c-ae90-4f7d1b2c3e56',
    });
  });

  it('derives the pinned ids for "ad-alert-8f2c1e4a"', () => {
    expect(deriveConversationIds('ad-alert-8f2c1e4a')).toEqual({
      incidentConversationId: '1822eae7-51f5-523e-935d-2b95020921d2',
      investigationConversationId: '7e0f90f6-221b-50f2-afe9-c2c9f7b581f5',
      tuningConversationId: '05edcb62-5713-5fea-b80b-8fc80d614817',
    });
  });

  it('derives the pinned ids for "ad-1"', () => {
    expect(deriveConversationIds('ad-1')).toEqual({
      incidentConversationId: '599acdd8-60fe-5234-a1c2-e198c6a8b5dc',
      investigationConversationId: '39280a7c-8b8e-5e7f-adb0-43095f2a9ed7',
      tuningConversationId: '5e740aec-8b75-5263-a37b-ec722f91ef6d',
    });
  });

  it('derives the pinned ids for the empty alert id (degraded derive_ids)', () => {
    expect(deriveConversationIds('')).toEqual({
      incidentConversationId: '8bcb32af-90e1-50d8-8b8e-6c70155dad40',
      investigationConversationId: '3a0f22c7-257e-571a-8113-941387ae6d24',
      tuningConversationId: '93491ac6-ca41-57cf-bd65-8d688edb2c3f',
    });
  });
});

describe('deriveThreadConversationId', () => {
  it('derives a valid UUID for a registered gate', () => {
    expect(
      uuidValidate(
        deriveThreadConversationId({
          correlationId: AD_ALERT_ID,
          gateId: PND_GATE_IDS.applyTuning,
        }) ?? ''
      )
    ).toBe(true);
  });

  it('is deterministic for the same (alert id, gate id)', () => {
    expect(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: PND_GATE_IDS.applyTuning,
      })
    ).toBe(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: PND_GATE_IDS.applyTuning,
      })
    );
  });

  it('derives a distinct id for every gate on one alert', () => {
    const ids = PND_GATE_REGISTRY.map(({ gateId }) =>
      deriveThreadConversationId({ correlationId: AD_ALERT_ID, gateId })
    );

    expect(new Set(ids).size).toBe(PND_GATE_REGISTRY.length);
  });

  it('derives different ids for different alert ids', () => {
    expect(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: PND_GATE_IDS.applyTuning,
      })
    ).not.toBe(
      deriveThreadConversationId({
        correlationId: 'ad-alert-other',
        gateId: PND_GATE_IDS.applyTuning,
      })
    );
  });

  it('never collides with the three container/worker conversation ids for the same alert', () => {
    const { incidentConversationId, investigationConversationId, tuningConversationId } =
      deriveConversationIds(AD_ALERT_ID);
    const derived = new Set([
      incidentConversationId,
      investigationConversationId,
      tuningConversationId,
    ]);

    PND_GATE_REGISTRY.forEach(({ gateId }) => {
      expect(
        derived.has(deriveThreadConversationId({ correlationId: AD_ALERT_ID, gateId }) ?? '')
      ).toBe(false);
    });
  });

  it('fails closed for a gate id outside PND_GATE_REGISTRY', () => {
    expect(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: 'not_a_pnd_gate',
      })
    ).toBeUndefined();
  });

  it('fails closed for a `waitForInput` step id, which is not a gate id', () => {
    expect(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: 'await_apply_tuning',
      })
    ).toBeUndefined();
  });

  it('fails closed for an empty alert id', () => {
    expect(
      deriveThreadConversationId({
        correlationId: '',
        gateId: PND_GATE_IDS.applyTuning,
      })
    ).toBeUndefined();
  });

  it('fails closed for a whitespace-only alert id', () => {
    expect(
      deriveThreadConversationId({
        correlationId: '   ',
        gateId: PND_GATE_IDS.applyTuning,
      })
    ).toBeUndefined();
  });
});

/**
 * The derivation input is `${correlationId}:${gateId}` — the gate id is the **suffix**,
 * deliberately.
 *
 * `gateId` is drawn from the closed {@link PND_GATE_REGISTRY} set and no member contains a `:`, so
 * the segment after the final `:` is always exactly the gate id: an `correlationId` that
 * itself contains `:` can never produce an ambiguous split, whatever it holds. The prefix form
 * (`${gateId}:${correlationId}`) would instead put the unbounded, externally-supplied
 * value in the position that has to be recovered, which requires an assumption about alert-id
 * content that PND cannot make.
 */
describe('deriveThreadConversationId (input ordering — the gate id is the suffix)', () => {
  it('hashes `${correlationId}:${gateId}` in the thread namespace', () => {
    expect(
      deriveThreadConversationId({
        correlationId: AD_ALERT_ID,
        gateId: PND_GATE_IDS.applyTuning,
      })
    ).toBe(uuidv5(`${AD_ALERT_ID}:${PND_GATE_IDS.applyTuning}`, PND_THREAD_NAMESPACE));
  });

  it('keeps an alert id that itself contains ":" unambiguous', () => {
    expect(
      deriveThreadConversationId({
        correlationId: `ad-1:${PND_GATE_IDS.applyTuning}`,
        gateId: PND_GATE_IDS.openInvestigation,
      })
    ).not.toBe(
      deriveThreadConversationId({
        correlationId: 'ad-1',
        gateId: PND_GATE_IDS.applyTuning,
      })
    );
  });
});

/**
 * {@link PND_THREAD_NAMESPACE} is fixed forever for the same reason the other three are: changing
 * it silently repoints every thread to a new id and orphans the conversations, attachments and
 * messages already sitting at the old one. These pinned values are the regression guard, and they
 * also prove that adding the fourth namespace left the three pre-existing ids byte-for-byte
 * unchanged.
 */
describe('deriveThreadConversationId (pinned ids — the namespace is fixed forever)', () => {
  it('pins the thread namespace constant itself', () => {
    expect(PND_THREAD_NAMESPACE).toBe('d4a7f5b1-9e60-4c2d-bfa1-5a8e2c3d4f67');
  });

  it('keeps all four namespace constants distinct', () => {
    expect(
      new Set([
        PND_INCIDENT_NAMESPACE,
        PND_INVESTIGATION_NAMESPACE,
        PND_THREAD_NAMESPACE,
        PND_TUNING_NAMESPACE,
      ]).size
    ).toBe(4);
  });

  it('derives the pinned thread ids for "ad-alert-8f2c1e4a"', () => {
    expect(deriveAllThreadConversationIds('ad-alert-8f2c1e4a')).toEqual([
      {
        gateId: 'open_investigation',
        threadConversationId: '05bab14c-833c-5100-8316-1ea03f558840',
      },
      { gateId: 'promote_incident', threadConversationId: '3974a651-9686-5ccf-87e7-fe4a026f943c' },
      {
        gateId: 'incident_contained',
        threadConversationId: 'b8a62f68-1a24-5091-a816-0d7d1254651d',
      },
      { gateId: 'apply_tuning', threadConversationId: '16a661da-8c3d-54eb-869c-d9c7d49a9de8' },
    ]);
  });

  it('derives the pinned thread ids for "ad-1"', () => {
    expect(deriveAllThreadConversationIds('ad-1')).toEqual([
      {
        gateId: 'open_investigation',
        threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
      },
      { gateId: 'promote_incident', threadConversationId: 'c66b6d13-ca09-5e36-8774-7e13ceac6db1' },
      {
        gateId: 'incident_contained',
        threadConversationId: '2d0c3fb5-15e0-5c53-836d-fac1bf7c2b82',
      },
      { gateId: 'apply_tuning', threadConversationId: '8f3f960c-2972-5f32-be9e-742308bea5ce' },
    ]);
  });
});

/**
 * kibana-phf4.5 / ADR-015 moved the whole Attack Discovery lane from `watch_deep.yaml` to
 * `watch_floor.yaml`, which repointed three {@link PND_GATE_REGISTRY} rows at a different watch id.
 * Not one conversation id may change as a result — the four namespaces key on the Attack Discovery
 * alert id and the `gateId`, never on the watch that happens to host the gate, so every persisted
 * conversation, thread, attachment and message stays where it is.
 *
 * The pinned-id suites above are the byte-level guard; these are the reasons it holds, asserted
 * directly so the next relocation cannot quietly become a migration. Deliberately phrased against
 * {@link SYSTEM_SECURITY_WATCH_IDS} as a whole rather than the two ids this bead touched: any watch
 * id reaching a hashed input at all would be the defect.
 */
describe('conversation ids are invariant under a watch relocation (kibana-phf4.5, ADR-015)', () => {
  it('takes the alert id alone, so there is no watch id to pass', () => {
    expect(deriveConversationIds).toHaveLength(1);
  });

  it('builds every hashed input out of values that name no watch', () => {
    const hashedInputs = [
      AD_ALERT_ID,
      ...PND_GATE_REGISTRY.map(({ gateId }) => `${AD_ALERT_ID}:${gateId}`),
    ];

    hashedInputs.forEach((input) => {
      SYSTEM_SECURITY_WATCH_IDS.forEach((watchId) => {
        expect(input).not.toContain(watchId);
      });
    });
  });

  it('hashes `${correlationId}:${gateId}` for a thread, a string naming no watch', () => {
    PND_GATE_REGISTRY.forEach(({ gateId }) => {
      expect(deriveThreadConversationId({ correlationId: AD_ALERT_ID, gateId })).toBe(
        uuidv5(`${AD_ALERT_ID}:${gateId}`, PND_THREAD_NAMESPACE)
      );
    });
  });

  it('derives the same thread id for gates hosted by different watches', () => {
    // `open_investigation` sits on the Watch Floor since the move and `apply_tuning` has always sat
    // on the Detection Watch; both derive from the alert id and their own gate id alone, so the two
    // differ only by gate id — never by host watch.
    const [floorGate] = PND_GATE_REGISTRY.filter(({ gateId }) => gateId === 'open_investigation');
    const [detectionGate] = PND_GATE_REGISTRY.filter(({ gateId }) => gateId === 'apply_tuning');

    expect(floorGate.workflowId).not.toBe(detectionGate.workflowId);

    expect(
      [floorGate, detectionGate].map(({ gateId }) =>
        deriveThreadConversationId({ correlationId: AD_ALERT_ID, gateId })
      )
    ).toEqual(
      [floorGate, detectionGate].map(({ gateId }) =>
        uuidv5(`${AD_ALERT_ID}:${gateId}`, PND_THREAD_NAMESPACE)
      )
    );
  });
});

describe('deriveAllThreadConversationIds', () => {
  it('returns one pair per registered gate, in registry order', () => {
    expect(deriveAllThreadConversationIds(AD_ALERT_ID).map(({ gateId }) => gateId)).toEqual(
      PND_GATE_REGISTRY.map((gate) => gate.gateId)
    );
  });

  it('derives a valid UUID for every gate', () => {
    deriveAllThreadConversationIds(AD_ALERT_ID).forEach(({ threadConversationId }) => {
      expect(uuidValidate(threadConversationId)).toBe(true);
    });
  });

  it('agrees with deriveThreadConversationId gate by gate', () => {
    deriveAllThreadConversationIds(AD_ALERT_ID).forEach(({ gateId, threadConversationId }) => {
      expect(threadConversationId).toBe(
        deriveThreadConversationId({ correlationId: AD_ALERT_ID, gateId })
      );
    });
  });

  it('derives four distinct ids', () => {
    expect(
      new Set(
        deriveAllThreadConversationIds(AD_ALERT_ID).map(
          ({ threadConversationId }) => threadConversationId
        )
      ).size
    ).toBe(4);
  });

  it('fails closed for an empty alert id', () => {
    expect(deriveAllThreadConversationIds('')).toEqual([]);
  });

  it('fails closed for a whitespace-only alert id', () => {
    expect(deriveAllThreadConversationIds('   ')).toEqual([]);
  });
});

describe('getPndConversationKind', () => {
  it('classifies the investigation conversation', () => {
    const { investigationConversationId } = deriveConversationIds(AD_ALERT_ID);

    expect(getPndConversationKind(investigationConversationId, [AD_ALERT_ID])).toBe(
      'investigation'
    );
  });

  it('classifies the incident conversation', () => {
    const { incidentConversationId } = deriveConversationIds(AD_ALERT_ID);

    expect(getPndConversationKind(incidentConversationId, [AD_ALERT_ID])).toBe('incident');
  });

  it('classifies the tuning conversation', () => {
    const { tuningConversationId } = deriveConversationIds(AD_ALERT_ID);

    expect(getPndConversationKind(tuningConversationId, [AD_ALERT_ID])).toBe('tuning');
  });

  it('returns undefined for an unrelated conversation id', () => {
    expect(getPndConversationKind('not-a-pnd-conversation', [AD_ALERT_ID])).toBeUndefined();
  });

  it('returns undefined when the id derives from an alert not in the provided set', () => {
    const { investigationConversationId } = deriveConversationIds('ad-alert-elsewhere');

    expect(getPndConversationKind(investigationConversationId, [AD_ALERT_ID])).toBeUndefined();
  });

  it('finds a match among multiple alert ids', () => {
    const { incidentConversationId } = deriveConversationIds(AD_ALERT_ID);

    expect(
      getPndConversationKind(incidentConversationId, ['ad-alert-a', AD_ALERT_ID, 'ad-alert-b'])
    ).toBe('incident');
  });
});

describe('deriveWorkerConversationId', () => {
  it('derives a valid UUID for a registered worker workflow', () => {
    expect(
      uuidValidate(
        deriveWorkerConversationId({
          correlationId: AD_ALERT_ID,
          workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
        }) ?? ''
      )
    ).toBe(true);
  });

  it('is deterministic for the same (alert id, worker workflow id)', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: AD_ALERT_ID,
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBe(
      deriveWorkerConversationId({
        correlationId: AD_ALERT_ID,
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    );
  });

  it('derives different ids for different alert ids', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: AD_ALERT_ID,
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).not.toBe(
      deriveWorkerConversationId({
        correlationId: 'ad-alert-other',
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    );
  });

  it('never collides with the four existing conversation ids for the same alert', () => {
    const { incidentConversationId, investigationConversationId, tuningConversationId } =
      deriveConversationIds(AD_ALERT_ID);
    const derived = new Set([
      incidentConversationId,
      investigationConversationId,
      tuningConversationId,
      ...deriveAllThreadConversationIds(AD_ALERT_ID).map(
        ({ threadConversationId }) => threadConversationId
      ),
    ]);

    expect(
      derived.has(
        deriveWorkerConversationId({
          correlationId: AD_ALERT_ID,
          workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
        }) ?? ''
      )
    ).toBe(false);
  });

  it('fails closed for a workflow id that is not a registered worker', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: AD_ALERT_ID,
        workerWorkflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      })
    ).toBeUndefined();
  });

  it('fails closed for an empty alert id', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: '',
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBeUndefined();
  });

  it('fails closed for a whitespace-only alert id', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: '   ',
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBeUndefined();
  });
});

/**
 * The derivation input is `${correlationId}:${workerWorkflowId}` — the workflow id is the
 * suffix, the same ordering as {@link deriveThreadConversationId}. A worker conversation is keyed
 * on the workflow that owns it, so two workers on one alert cannot share an id. That is the
 * opposite of the four older namespaces, which must stay invariant under a watch relocation.
 */
describe('deriveWorkerConversationId (input ordering — the workflow id is the suffix)', () => {
  it('hashes `${correlationId}:${workerWorkflowId}` in the worker namespace', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: AD_ALERT_ID,
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBe(uuidv5(`${AD_ALERT_ID}:${SYSTEM_SECURITY_WATCH_DEEP_ID}`, PND_WORKER_NAMESPACE));
  });
});

/**
 * {@link PND_WORKER_NAMESPACE} is fixed forever for the same reason the other four are: changing
 * it silently repoints every worker conversation to a new id. These pinned values are the
 * regression guard, and they also prove that adding the fifth namespace left the four
 * pre-existing ids byte-for-byte unchanged.
 */
describe('deriveWorkerConversationId (pinned ids — the namespace is fixed forever)', () => {
  it('pins the worker namespace constant itself', () => {
    expect(PND_WORKER_NAMESPACE).toBe('e5b8c6c2-af72-4d3e-b0b2-7c0a4e5f6189');
  });

  it('keeps all five namespace constants distinct', () => {
    expect(
      new Set([
        PND_INCIDENT_NAMESPACE,
        PND_INVESTIGATION_NAMESPACE,
        PND_THREAD_NAMESPACE,
        PND_TUNING_NAMESPACE,
        PND_WORKER_NAMESPACE,
      ]).size
    ).toBe(5);
  });

  it('pins the four older namespaces to the same literals they had before the fifth was added', () => {
    expect({
      incident: PND_INCIDENT_NAMESPACE,
      investigation: PND_INVESTIGATION_NAMESPACE,
      thread: PND_THREAD_NAMESPACE,
      tuning: PND_TUNING_NAMESPACE,
    }).toEqual({
      incident: 'b2e5d3f9-7c4e-4a0b-9d8f-3e6c0a1b2d45',
      investigation: 'a1f4c2e8-6b3d-4f9a-8c7e-2d5b9f0a1c34',
      thread: 'd4a7f5b1-9e60-4c2d-bfa1-5a8e2c3d4f67',
      tuning: 'c3f6e4a0-8d5f-4b1c-ae90-4f7d1b2c3e56',
    });
  });

  it('derives the pinned worker id for "ad-alert-8f2c1e4a"', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: 'ad-alert-8f2c1e4a',
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBe('c7efe249-716e-5cbb-99ad-014cb658090c');
  });

  it('derives the pinned worker id for "ad-1"', () => {
    expect(
      deriveWorkerConversationId({
        correlationId: 'ad-1',
        workerWorkflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
      })
    ).toBe('717a0ad0-ed9c-5f5a-98fe-143eb35ecc55');
  });
});

describe('deriveAllWorkerConversationIds', () => {
  it('returns one pair per registered worker workflow, in registry order', () => {
    expect(
      deriveAllWorkerConversationIds(AD_ALERT_ID).map(({ workerWorkflowId }) => workerWorkflowId)
    ).toEqual([...PND_WORKER_WORKFLOW_IDS]);
  });

  it('agrees with deriveWorkerConversationId workflow by workflow', () => {
    deriveAllWorkerConversationIds(AD_ALERT_ID).forEach(
      ({ workerConversationId, workerWorkflowId }) => {
        expect(workerConversationId).toBe(
          deriveWorkerConversationId({
            correlationId: AD_ALERT_ID,
            workerWorkflowId,
          })
        );
      }
    );
  });

  it('fails closed for an empty alert id', () => {
    expect(deriveAllWorkerConversationIds('')).toEqual([]);
  });
});

/**
 * Decision 7 (project-daybreak #137) says incident↔investigation is many-to-many. PND's ids key
 * on a single Attack Discovery alert id, so the thin slice is strictly 1:1. Changing that would
 * break every derivation the projection rests on — one investigation id, one incident id, one
 * `promotedFrom` pointer, all from the same correlation key.
 */
describe('incident and investigation are 1:1 per correlation id (thin-slice divergence)', () => {
  it('derives exactly one investigation and one incident from one alert id', () => {
    const { incidentConversationId, investigationConversationId } =
      deriveConversationIds(AD_ALERT_ID);

    expect(
      new Set([incidentConversationId, investigationConversationId, 'ad-alert-other-pair']).size
    ).toBe(3);
  });

  it('derives a different investigation/incident pair for a different alert id', () => {
    const first = deriveConversationIds(AD_ALERT_ID);
    const second = deriveConversationIds('ad-alert-other');

    expect(first.investigationConversationId).not.toBe(second.investigationConversationId);
    expect(first.incidentConversationId).not.toBe(second.incidentConversationId);
  });
});
