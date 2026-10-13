/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, DOCKER, FIXTURE_EVIDENCE, ROD } from './__fixtures__/evidence';
import { buildEvidenceIndex } from './evidence_index';
import { checkMentions, clampVisible } from './mentions';

const withSummary = (summary: string): Brief => {
  const brief = buildValidBrief();
  brief.areas[0].summary = summary;
  return brief;
};

const run = (brief: Brief, evidence: Evidence = FIXTURE_EVIDENCE) =>
  checkMentions(brief, { index: buildEvidenceIndex(evidence), dropped: new Set() });

const TWO_DOCKER_HOSTS: Evidence = {
  ...FIXTURE_EVIDENCE,
  entities: {
    ...FIXTURE_EVIDENCE.entities,
    'host:docker-host-prod-01-b': {
      entity: { id: 'host:docker-host-prod-01-b', name: 'docker-host-prod-01', type: 'host' },
    },
  },
};

describe('checkMentions', () => {
  it.each<[string, string, string, Evidence]>([
    [
      'keeps EUID tokens, normalising spacing',
      `{{entity.id ${ROD}}} reached {{ entity.id  ${DOCKER} }}.`,
      `{{ entity.id ${ROD} }} reached {{ entity.id ${DOCKER} }}.`,
      FIXTURE_EVIDENCE,
    ],
    [
      'upgrades a name token that matches one entity',
      'Access to {{ host.name docker-host-prod-01 }}.',
      `Access to {{ entity.id ${DOCKER} }}.`,
      FIXTURE_EVIDENCE,
    ],
    [
      'unlinks a name token that matches two entities',
      'Access to {{ host.name docker-host-prod-01 }}.',
      'Access to docker-host-prod-01.',
      TWO_DOCKER_HOSTS,
    ],
    [
      'unlinks a name token with the wrong type field',
      'Access by {{ host.name a.rodriguez }}.',
      'Access by a.rodriguez.',
      FIXTURE_EVIDENCE,
    ],
    [
      'unlinks a token cut off by trimming',
      `{{ entity.id ${ROD} }} reached {{ entity.id host:docker-ho…`,
      `{{ entity.id ${ROD} }} reached…`,
      FIXTURE_EVIDENCE,
    ],
  ])('%s', (_name, summary, expected, evidence) => {
    const outcome = run(withSummary(summary), evidence);
    expect(outcome.brief.areas[0].summary).toBe(expected);
    expect(outcome.drops).toEqual([]);
  });

  it('fails a claim that mentions an entity not in the evidence', () => {
    const brief = withSummary('{{ entity.id user:mallory }} logged on.');
    brief.verdict.summary = '{{ entity.id host:unknown }} is at risk.';

    const { drops, structuralErrors } = run(brief);

    expect(drops).toEqual([expect.objectContaining({ path: 'areas[0]', check: 'citation' })]);
    expect(structuralErrors).toEqual([expect.stringContaining('host:unknown')]);
  });

  describe('clampVisible', () => {
    const nameOf = (euid: string) => (euid === ROD ? 'a.rodriguez' : euid);
    const mention = `{{ entity.id ${ROD} }}`;

    it.each<[string, string, number, string]>([
      [
        'keeps text whose visible length fits',
        `${mention} logged on to a host`,
        31,
        `${mention} logged on to a host`,
      ],
      [
        'counts a mention as its name, not its token',
        `${mention} logged on`,
        22,
        `${mention} logged on`,
      ],
      [
        'cuts at a word boundary after a mention',
        `${mention} logged on to a host`,
        24,
        `${mention} logged on…`,
      ],
      [
        'drops a mention that does not fit rather than splitting it',
        `Access by ${mention}`,
        15,
        'Access by…',
      ],
    ])('%s', (_name, text, max, expected) => {
      expect(clampVisible(text, max, nameOf)).toBe(expected);
    });
  });
});
