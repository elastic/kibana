/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEncodedPowershellTwin,
  getEncodedPowershellIds,
} from '../scenarios/encoded_powershell';
import {
  buildServerlessPlan,
  cleanupServerlessSeed,
  toAnonymizedAlerts,
  toValidateAttackDiscovery,
  twinToWorld,
} from './seed_live';

const ids = getEncodedPowershellIds();

describe('buildServerlessPlan', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));
  const plan = buildServerlessPlan(world, 'fptp-eval-1', now);

  it('targets the space alerts data stream with create operations', () => {
    expect(plan.alertsIndex).toBe('.alerts-security.alerts-fptp-eval-1');
    expect(plan.alertOperations[0]).toEqual({
      create: { _index: '.alerts-security.alerts-fptp-eval-1', _id: plan.alertIds[0] },
    });
    // document body follows its header
    expect(plan.alertOperations[1]).toBe(plan.world.alerts[0].source);
  });

  it('never emits an index operation for alerts', () => {
    expect(
      plan.alertOperations.some(
        (operation, position) => position % 2 === 0 && 'index' in (operation as object)
      )
    ).toBe(false);
  });

  it('rewrites events into the seeder-owned namespace', () => {
    expect(plan.serverlessEvents[0]).toEqual({
      index: 'logs-endpoint.events.fp-tp-process-fptp-eval-1',
      id: ids.process1Id,
    });
    expect(plan.eventOperations[0]).toEqual({
      create: {
        _index: 'logs-endpoint.events.fp-tp-process-fptp-eval-1',
        _id: ids.process1Id,
      },
    });
  });

  it('names the space ad-hoc Attack Discovery index', () => {
    expect(plan.adhocAttackIndex).toBe(
      '.adhoc.alerts-security.attack.discovery.alerts-fptp-eval-1'
    );
  });

  it('keeps the classic plan ids and entities so cleanup covers them', () => {
    expect(plan.alertIds).toEqual(world.alerts.map((alert) => alert.id));
    expect(plan.entities).toHaveLength(world.entities.length);
    expect(plan.hostIds).toEqual([ids.hostId]);
  });
});

describe('toValidateAttackDiscovery', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));
  const attack = world.attack ?? {};

  it('maps the authored attack onto the validate payload fields', () => {
    const payload = toValidateAttackDiscovery(attack) as Record<string, unknown>;
    expect(payload.alert_ids).toBe(attack['kibana.alert.attack_discovery.alert_ids']);
    expect(payload.title).toBe(attack['kibana.alert.attack_discovery.title']);
    expect(payload.summary_markdown).toBe(attack['kibana.alert.attack_discovery.summary_markdown']);
  });

  it('throws when the attack cites no alert ids', () => {
    expect(() => toValidateAttackDiscovery({ 'kibana.alert.attack_discovery.title': 'x' })).toThrow(
      /no kibana.alert.attack_discovery.alert_ids/
    );
  });
});

describe('toAnonymizedAlerts', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));

  it('returns one Document per alert with metadata and page content', () => {
    const anonymized = toAnonymizedAlerts(world.alerts);
    expect(anonymized).toHaveLength(world.alerts.length);
    expect(anonymized[0]).toEqual({
      metadata: { author: 'fptp-seeder' },
      page_content: expect.stringContaining(world.alerts[0].id) as string,
    });
  });
});

describe('cleanupServerlessSeed', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));
  const plan = buildServerlessPlan(world, 'fptp-eval-1', new Date('2026-10-13T12:00:00.000Z'));

  it('removes the persisted discovery with a text-safe title query, not a term query', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 404, body: {} });

    await cleanupServerlessSeed({
      esClient: { deleteByQuery, search } as unknown as Parameters<
        typeof cleanupServerlessSeed
      >[0]['esClient'],
      kbnRequest,
      plan,
    });

    const adhocCall = deleteByQuery.mock.calls
      .map(([params]) => params)
      .find((params) => params.index === plan.adhocAttackIndex);
    // The title field is analyzed text on the ad-hoc index; `term` never matches it.
    expect(adhocCall.query).toEqual({
      match_phrase: { 'kibana.alert.attack_discovery.title': plan.attackTitle },
    });
  });
});
