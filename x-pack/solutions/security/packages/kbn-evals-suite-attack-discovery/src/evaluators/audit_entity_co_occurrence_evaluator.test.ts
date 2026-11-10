/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAlerts } from '../audit_failure_classes/render_alert';
import type { AuditAlert } from '../audit_failure_classes/types';
import type { AttackDiscoveryDatasetExample } from '../types';
import { createAuditEntityCoOccurrenceEvaluator } from './audit_entity_co_occurrence_evaluator';
import {
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const evaluator = createAuditEntityCoOccurrenceEvaluator(resolveReferenceFromMetadata);

const alerts: AuditAlert[] = [
  {
    id: 'a1',
    fields: { 'user.name': 'alice', 'source.ip': '203.0.113.50', 'cloud.account.id': '111' },
  },
  {
    id: 'b1',
    fields: { 'user.name': 'bob', 'source.ip': '203.0.113.50', 'cloud.account.id': '333' },
  },
];

const { anonymizedAlerts, replacements } = renderAlerts(alerts, 'enriched', 'entity-test');

const input: AttackDiscoveryDatasetExample['input'] = {
  mode: 'bundledAlerts',
  anonymizedAlerts,
};

const run = (discoveries: Array<Parameters<typeof makeDiscovery>[0]>) =>
  evaluator.evaluate({
    input,
    output: makeOutput(discoveries.map(makeDiscovery)),
    expected: undefined,
    metadata: { gold: makeGold(), replacements },
  } as never);

describe('EntityCoOccurrence evaluator', () => {
  it('scores 1 when the asserted user and IP appear together in a cited alert', async () => {
    const result = await run([
      {
        alertIds: ['a1'],
        detailsMarkdown: '- {{ user.name alice }} signed in from {{ source.ip 203.0.113.50 }}',
      },
    ]);
    expect(result).toMatchObject({ score: 1, label: 'grounded' });
  });

  it('scores 0 for a user and account that no cited alert pairs', async () => {
    const result = await run([
      {
        alertIds: ['a1', 'b1'],
        detailsMarkdown: '- {{ user.name alice }} acted in {{ cloud.account.id 333 }}',
      },
    ]);
    expect(result).toMatchObject({ score: 0, label: 'ungrounded_pairs' });
  });

  it('computes grounded pairs over asserted pairs', async () => {
    const result = await run([
      {
        alertIds: ['a1', 'b1'],
        detailsMarkdown:
          '{{ user.name alice }} {{ user.name bob }} both used {{ source.ip 203.0.113.50 }}',
      },
    ]);
    expect(result).toMatchObject({ score: 1 });

    const mixed = await run([
      {
        alertIds: ['a1'],
        detailsMarkdown:
          '{{ user.name alice }} {{ user.name bob }} both used {{ source.ip 203.0.113.50 }}',
      },
    ]);
    expect(mixed).toMatchObject({ score: 0.5, label: 'ungrounded_pairs' });
  });

  it('does not ground a pair using an uncited alert', async () => {
    const result = await run([
      {
        alertIds: ['b1'],
        detailsMarkdown: '{{ user.name alice }} used {{ source.ip 203.0.113.50 }}',
      },
    ]);
    expect(result).toMatchObject({ score: 0 });
  });

  it('does not ground a pair whose values come from two different cited alerts', async () => {
    const result = await run([
      {
        alertIds: ['a1', 'b1'],
        detailsMarkdown: '{{ user.name bob }} acted in {{ cloud.account.id 111 }}',
      },
    ]);
    expect(result).toMatchObject({ score: 0 });
  });

  it('is N/A when no user and linked-entity pair is asserted', async () => {
    const onlyUser = await run([{ alertIds: ['a1'], detailsMarkdown: '{{ user.name alice }}' }]);
    expect(onlyUser).toMatchObject({ score: null, label: 'N/A' });
  });

  it('reads the alert values behind anonymization tokens', () => {
    const userLine = anonymizedAlerts[0].pageContent
      .split('\n')
      .find((line) => /^user\.name,/.test(line));
    expect(userLine).not.toContain('alice');
    expect(Object.values(replacements)).toContain('alice');
  });

  it('matches model output that repeats anonymization tokens', async () => {
    const [token] = Object.entries(replacements).find(([, value]) => value === 'alice') ?? [];
    const result = await run([
      {
        alertIds: ['a1'],
        detailsMarkdown: `{{ user.name ${token} }} used {{ source.ip 203.0.113.50 }}`,
      },
    ]);
    expect(result).toMatchObject({ score: 1, label: 'grounded' });
  });

  describe('plain-text fallback when the discovery has no tokens', () => {
    it('grounds a user and IP in one cited alert', async () => {
      const result = await run([
        { alertIds: ['a1'], detailsMarkdown: 'alice used 203.0.113.50 to sign in' },
      ]);
      expect(result).toMatchObject({ score: 1, label: 'grounded' });
    });

    it('flags a user paired with an IP no cited alert carries', async () => {
      const result = await run([
        {
          alertIds: ['b1'],
          detailsMarkdown: 'alice used 203.0.113.50 to sign in',
        },
      ]);
      expect(result).toMatchObject({ score: 0, label: 'ungrounded_pairs' });
    });

    it('does not match a value inside a longer one', async () => {
      const result = await run([
        { alertIds: ['a1'], detailsMarkdown: 'alice used 203.0.113.500 to sign in' },
      ]);
      expect(result).toMatchObject({ score: null, label: 'N/A' });
    });

    it('is N/A when only one entity is named', async () => {
      const result = await run([{ alertIds: ['a1'], detailsMarkdown: 'alice signed in' }]);
      expect(result).toMatchObject({ score: null, label: 'N/A' });
    });
  });

  it('is N/A with no discoveries', async () => {
    expect(await run([])).toMatchObject({ score: null, label: 'N/A' });
  });
});
