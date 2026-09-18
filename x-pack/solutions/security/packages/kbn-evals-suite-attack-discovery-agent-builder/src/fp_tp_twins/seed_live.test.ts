/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { AD2_ALERTS_INDEX } from '../scenario_registry';
import {
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_PROCESS_1_ID,
  FP_TP_ATTACK_ADHOC_INDEX,
} from './constants';
import { buildEncodedPowershellLiveSeedPlan, cleanupEncodedPowershellTwinLive } from './seed_live';

describe('buildEncodedPowershellLiveSeedPlan', () => {
  const now = new Date('2026-09-17T16:00:00.000Z');
  const plan = buildEncodedPowershellLiveSeedPlan('fp', now);

  it('returns the authored attack document id', () => {
    expect(plan.attackId).toBe(ENCODED_POWERSHELL_ATTACK_ID);
  });

  it('returns the adhoc Attack Discovery index', () => {
    expect(plan.attackIndex).toBe(FP_TP_ATTACK_ADHOC_INDEX);
  });

  it('returns alert bulk operations targeting the detection alerts index', () => {
    expect(plan.alertOperations[0]).toEqual({
      index: { _index: AD2_ALERTS_INDEX, _id: 'ad-scenario-encoded-powershell-alert-1' },
    });
  });

  it('returns event bulk operations that create into logs data streams', () => {
    expect(plan.eventOperations[0]).toEqual({
      create: {
        _index: 'logs-endpoint.events.process-default',
        _id: ENCODED_POWERSHELL_PROCESS_1_ID,
      },
    });
  });

  it('returns attack-discovery as the synthetic attack rule type', () => {
    expect(plan.attackDocument['kibana.alert.rule.rule_type_id']).toBe('attack-discovery');
  });

  it('returns a host CRUD request for the FP discriminator entity', () => {
    expect(plan.entities.some((entity) => entity.entityType === 'host')).toBe(true);
  });

  it('returns false_positive gold for the fp variant', () => {
    expect(plan.twin.gold.classification).toBe('false_positive');
  });
});

describe('cleanupEncodedPowershellTwinLive', () => {
  it('returns a delete-by-id query for leftover data-stream events', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});

    await cleanupEncodedPowershellTwinLive({ deleteByQuery } as unknown as EsClient, [
      {
        index: 'logs-endpoint.events.process-default',
        id: ENCODED_POWERSHELL_PROCESS_1_ID,
      },
    ]);

    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-endpoint.events.process-default',
        query: { ids: { values: [ENCODED_POWERSHELL_PROCESS_1_ID] } },
      })
    );
  });
});
