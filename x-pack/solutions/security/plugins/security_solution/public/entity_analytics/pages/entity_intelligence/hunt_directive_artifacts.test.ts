/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { EvidenceHuntArtifact, EntityHuntArtifact, HuntArtifact } from './hunt_artifacts';
import {
  buildGroundedDirectiveArtifacts,
  groundHuntDirectives,
  parseDirectivesFromStructuredOutput,
  parseDirectivesFromText,
  stripDirectiveBlocks,
  type DirectiveHuntArtifact,
  type GroundedAlertTable,
  type GroundedEntityCard,
  type GroundedMitreStrip,
  type GroundedRiskGauge,
  type GroundedSankey,
} from './hunt_directive_artifacts';

const evidence = (rows: Array<Record<string, unknown>>): EvidenceHuntArtifact => ({
  id: 'evidence-1',
  type: 'evidence',
  toolId: 'platform.core.execute_esql',
  query: 'FROM .alerts-security.alerts-*',
  rowCount: rows.length,
  columns: [...new Set(rows.flatMap((row) => Object.keys(row)))],
  rows,
});

const entityArtifact = (
  name: string,
  overrides: Partial<EntityHuntArtifact['entity']> = {},
  alertCount?: number
): EntityHuntArtifact => ({
  id: `entity:${name}`,
  type: 'entity',
  entity: {
    id: name,
    name,
    type: EntityType.user,
    identifierValue: name,
    riskScoreNorm: overrides.riskScoreNorm,
    riskLevel: overrides.riskLevel ?? 'Unknown',
    criticality: overrides.criticality,
    source: undefined,
    lastSeen: overrides.lastSeen,
  },
  alertCount,
  canInvestigate: true,
});

const dataOf = <T extends DirectiveHuntArtifact['data']['type']>(
  grounded: DirectiveHuntArtifact[],
  type: T
) => grounded.find((g) => g.directiveType === type)?.data;

describe('hunt_directive_artifacts', () => {
  describe('parseDirectivesFromStructuredOutput', () => {
    it('extracts valid directives and skips unknown types', () => {
      const directives = parseDirectivesFromStructuredOutput({
        artifacts: [
          { type: 'entity_card', entity: 'svc-backup' },
          { type: 'not_a_real_type', entity: 'x' },
          { type: 'mitre_strip' },
          'garbage',
          42,
        ],
      });
      expect(directives).toHaveLength(2);
      expect(directives.map((d) => d.type)).toEqual(['entity_card', 'mitre_strip']);
    });

    it('returns [] when there is no artifacts array', () => {
      expect(parseDirectivesFromStructuredOutput({})).toEqual([]);
      expect(parseDirectivesFromStructuredOutput(undefined)).toEqual([]);
      expect(parseDirectivesFromStructuredOutput('nope')).toEqual([]);
    });
  });

  describe('parseDirectivesFromText', () => {
    it('parses a fenced hunt-artifacts block', () => {
      const text = [
        'Here is the analysis.',
        '```hunt-artifacts',
        '[{"type":"entity_card","entity":"alice"},{"type":"alert_table"}]',
        '```',
      ].join('\n');
      const directives = parseDirectivesFromText(text);
      expect(directives.map((d) => d.type)).toEqual(['entity_card', 'alert_table']);
    });

    it('tolerates malformed JSON by skipping the block', () => {
      const text = '```hunt-artifacts\n[{"type": "entity_card", ]\n```';
      expect(parseDirectivesFromText(text)).toEqual([]);
    });

    it('returns [] when there is no fenced block', () => {
      expect(parseDirectivesFromText('just prose, no fences')).toEqual([]);
    });
  });

  describe('stripDirectiveBlocks', () => {
    it('removes a parsed hunt-artifacts block but keeps prose', () => {
      const text = 'Answer.\n```hunt-artifacts\n[{"type":"mitre_strip"}]\n```\nMore.';
      const stripped = stripDirectiveBlocks(text);
      expect(stripped).toContain('Answer.');
      expect(stripped).toContain('More.');
      expect(stripped).not.toContain('hunt-artifacts');
      expect(stripped).not.toContain('mitre_strip');
    });

    it('leaves a normal code block that is not artifacts intact', () => {
      const text = '```json\n{"foo": 1}\n```';
      expect(stripDirectiveBlocks(text)).toBe(text);
    });
  });

  describe('groundHuntDirectives — no fabrication', () => {
    it('drops an entity_card whose entity is absent from the evidence', () => {
      const artifacts: HuntArtifact[] = [evidence([{ 'user.name': 'alice' }])];
      const grounded = groundHuntDirectives([{ type: 'entity_card', entity: 'ghost' }], artifacts);
      expect(grounded).toHaveLength(0);
    });

    it('grounds an entity_card from a matching entity artifact + alert rows', () => {
      const artifacts: HuntArtifact[] = [
        entityArtifact('svc-backup', {
          riskLevel: 'High',
          riskScoreNorm: 78,
          criticality: 'high_impact',
        }),
        evidence([
          { 'user.name': 'svc-backup', 'kibana.alert.rule.name': 'Suspicious login' },
          { 'user.name': 'svc-backup', 'kibana.alert.rule.name': 'Impossible travel' },
        ]),
      ];
      const grounded = groundHuntDirectives(
        [{ type: 'entity_card', entity: 'svc-backup' }],
        artifacts
      );
      const card = dataOf(grounded, 'entity_card') as GroundedEntityCard;
      expect(card.name).toBe('svc-backup');
      expect(card.riskLevel).toBe('High');
      expect(card.riskScore).toBe(78);
      expect(card.alertCount).toBe(2);
    });

    it('builds an alert_table only from rows carrying a rule name', () => {
      const artifacts: HuntArtifact[] = [
        evidence([
          {
            'kibana.alert.rule.name': 'Brute force',
            'kibana.alert.severity': 'high',
            'user.name': 'bob',
            '@timestamp': '2026-07-17T10:00:00.000Z',
          },
          { 'user.name': 'bob' }, // no rule -> excluded
        ]),
      ];
      const grounded = groundHuntDirectives([{ type: 'alert_table' }], artifacts);
      const table = dataOf(grounded, 'alert_table') as GroundedAlertTable;
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toMatchObject({ rule: 'Brute force', severity: 'high', entity: 'bob' });
    });

    it('drops a risk_gauge when the entity has no risk score', () => {
      const artifacts: HuntArtifact[] = [entityArtifact('alice', { riskLevel: 'Unknown' })];
      const grounded = groundHuntDirectives([{ type: 'risk_gauge', entity: 'alice' }], artifacts);
      expect(grounded).toHaveLength(0);
    });

    it('grounds a risk_gauge from a real normalized score', () => {
      const artifacts: HuntArtifact[] = [
        entityArtifact('alice', { riskLevel: 'Critical', riskScoreNorm: 93 }),
      ];
      const grounded = groundHuntDirectives([{ type: 'risk_gauge', entity: 'alice' }], artifacts);
      const gauge = dataOf(grounded, 'risk_gauge') as GroundedRiskGauge;
      expect(gauge.score).toBe(93);
      expect(gauge.level).toBe('Critical');
    });

    it('counts real MITRE techniques and drops the strip when none are present', () => {
      const withTechniques: HuntArtifact[] = [
        evidence([
          { 'threat.technique.name': 'Valid Accounts', 'threat.technique.id': 'T1078' },
          { 'threat.technique.name': 'Valid Accounts', 'threat.technique.id': 'T1078' },
          { 'threat.technique.name': 'Brute Force', 'threat.technique.id': 'T1110' },
        ]),
      ];
      const strip = dataOf(
        groundHuntDirectives([{ type: 'mitre_strip' }], withTechniques),
        'mitre_strip'
      ) as GroundedMitreStrip;
      expect(strip.techniques[0]).toMatchObject({ name: 'Valid Accounts', id: 'T1078', count: 2 });

      const none = groundHuntDirectives(
        [{ type: 'mitre_strip' }],
        [evidence([{ 'user.name': 'x' }])]
      );
      expect(none).toHaveLength(0);
    });

    it('grounds a sankey from real source/destination flows', () => {
      const artifacts: HuntArtifact[] = [
        evidence([
          { 'source.ip': '10.0.0.1', 'destination.ip': '10.0.0.2' },
          { 'source.ip': '10.0.0.1', 'destination.ip': '10.0.0.2' },
          { 'source.ip': '10.0.0.3', 'destination.ip': '10.0.0.9' },
        ]),
      ];
      const sankey = dataOf(
        groundHuntDirectives([{ type: 'sankey' }], artifacts),
        'sankey'
      ) as GroundedSankey;
      expect(sankey.links[0]).toEqual({ source: '10.0.0.1', target: '10.0.0.2', value: 2 });
    });

    it('drops an attack_path with fewer than two ordered steps', () => {
      const artifacts: HuntArtifact[] = [
        evidence([
          { 'kibana.alert.rule.name': 'Only one', '@timestamp': '2026-07-17T10:00:00.000Z' },
        ]),
      ];
      expect(groundHuntDirectives([{ type: 'attack_path' }], artifacts)).toHaveLength(0);
    });

    it('assigns a stable-ish id and provenance to grounded artifacts', () => {
      const artifacts: HuntArtifact[] = [
        entityArtifact('alice', { riskLevel: 'High', riskScoreNorm: 70 }),
      ];
      const grounded = groundHuntDirectives([{ type: 'entity_card', entity: 'alice' }], artifacts);
      expect(grounded[0].id).toContain('entity_card');
      expect(grounded[0].provenance).toMatch(/grounded/i);
    });
  });

  describe('buildGroundedDirectiveArtifacts', () => {
    it('combines structured_output + narrative directives and grounds them', () => {
      const artifacts: HuntArtifact[] = [
        entityArtifact('alice', { riskLevel: 'High', riskScoreNorm: 70 }),
        evidence([{ 'user.name': 'alice', 'kibana.alert.rule.name': 'Rule A' }]),
      ];
      const grounded = buildGroundedDirectiveArtifacts({
        structuredOutput: { artifacts: [{ type: 'entity_card', entity: 'alice' }] },
        narrative: '```hunt-artifacts\n[{"type":"alert_table","entity":"alice"}]\n```',
        artifacts,
      });
      expect(grounded.map((g) => g.directiveType).sort()).toEqual(['alert_table', 'entity_card']);
    });

    it('returns [] when there are no directives', () => {
      expect(buildGroundedDirectiveArtifacts({ narrative: 'no fences', artifacts: [] })).toEqual(
        []
      );
    });

    it('grounds a sankey from the canvas fixture rows (source.ip/destination.ip)', () => {
      const artifacts: HuntArtifact[] = [
        evidence([
          { 'source.ip': '10.0.1.45', 'destination.ip': '10.0.0.1' },
          { 'source.ip': '10.0.1.46', 'destination.ip': '10.0.0.2' },
        ]),
      ];
      const content = '```hunt-artifacts\n[{"type":"sankey"},{"type":"mitre_strip"}]\n```';
      const grounded = buildGroundedDirectiveArtifacts({ narrative: content, artifacts });
      expect(grounded.map((g) => g.directiveType)).toEqual(['sankey']);
    });
  });
});
