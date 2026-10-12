/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { briefFixture, evidenceFixture } from '../__fixtures__/brief_fixture';
import { buildActionTriageRequest, buildThreatTriageRequest } from './triage_requests';

const [s1, , s3] = briefFixture.threats;

describe('triage requests', () => {
  describe('buildThreatTriageRequest', () => {
    const request = buildThreatTriageRequest({ threat: s1, rank: 1, evidence: evidenceFixture });

    it('asks the agent to verify before recommending', () => {
      expect(request.instruction).toContain(`priority threat 1 ("${s1.title}")`);
      expect(request.instruction).toMatch(/verify from the live data/);
    });

    it('lists the entities by name with their traits', () => {
      expect(request.evidenceMarkdown).toContain(
        '- a.rodriguez (user; criticality high impact; privileged; risk High (75); watchlists Privileged Users; 3 resolved aliases)'
      );
      expect(request.evidenceMarkdown).toContain(
        '- docker-host-prod-01 (host; criticality extreme impact; risk Moderate (64))'
      );
    });

    it('lists facts with time, title and numbers, in time order', () => {
      const lines = request.evidenceMarkdown.split('\n');
      const first = lines.findIndex((line) => line.includes('6 alerts on a.rodriguez'));
      const second = lines.findIndex((line) =>
        line.includes('First-ever logon from a.rodriguez to jump-box-01')
      );
      expect(first).toBeGreaterThan(-1);
      expect(second).toBeGreaterThan(first);
      expect(lines[first]).toBe(
        '- 2026-10-08T08:30:00.000Z: 6 alerts on a.rodriguez, up to critical severity (severity critical; alert count 6; tactics Initial Access, Execution)'
      );
    });

    it('lists links with their fixed verbs and the response state', () => {
      expect(request.evidenceMarkdown).toContain(
        '- a.rodriguez and jump-box-01: part of the same discovered attack'
      );
      expect(request.evidenceMarkdown).toContain(
        '- a.rodriguez logged on to (rarely) jump-box-01 (first seen 2026-10-09T10:00:00.000Z)'
      );
      expect(request.evidenceMarkdown).toContain(
        'Response: unaddressed; alerts open 12, acknowledged 0, closed 0; no case'
      );
    });

    it('never includes internal ids', () => {
      expect(request.evidenceMarkdown).not.toMatch(/ENT-\d|F-\d|L-\d|user:a\.rodriguez@/);
    });

    it('describes non-symmetric links in the direction of the relationship', () => {
      const { evidenceMarkdown } = buildThreatTriageRequest({
        threat: s3,
        rank: 3,
        evidence: evidenceFixture,
      });
      expect(evidenceMarkdown).toContain('- build-runner-02 communicates with fileserver-03');
    });
  });

  describe('buildActionTriageRequest', () => {
    it('includes the action, rationale, targets and the related threat', () => {
      const request = buildActionTriageRequest({
        action: briefFixture.actions[0],
        brief: briefFixture,
        evidence: evidenceFixture,
      });

      expect(request.instruction).toContain(briefFixture.actions[0].action);
      expect(request.evidenceMarkdown).toContain('Urgency: Now; owner: SOC');
      expect(request.evidenceMarkdown).toContain(
        `Relates to priority threat 1: ${s1.title} (critical)`
      );
      expect(request.evidenceMarkdown).toContain('### Targets\n- a.rodriguez (');
      expect(request.evidenceMarkdown).toContain(
        'First-ever logon from a.rodriguez to jump-box-01'
      );
    });

    it('copes with an action that has no threat, targets or evidence', () => {
      const request = buildActionTriageRequest({
        action: briefFixture.actions[4],
        brief: briefFixture,
        evidence: evidenceFixture,
      });

      expect(request.evidenceMarkdown).not.toContain('Relates to');
      expect(request.evidenceMarkdown).toContain('### Targets\n- None recorded');
      expect(request.evidenceMarkdown).toContain('### Facts\n- None recorded');
    });
  });
});
