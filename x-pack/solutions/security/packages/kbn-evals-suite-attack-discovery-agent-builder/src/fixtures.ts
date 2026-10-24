/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';

export const attackDiscoveryFixtureMarker = 'ad2-agent-builder-eval-20260712';
export const attackDiscoveryFixtureIndex = '.alerts-security.alerts-default';

const fixtureAlertIds = [
  `${attackDiscoveryFixtureMarker}-powershell`,
  `${attackDiscoveryFixtureMarker}-lsass`,
] as const;

export const providedAlertFixture = {
  ids: fixtureAlertIds,
  alertCount: fixtureAlertIds.length,
  question: `Run Attack Discovery for the two provided alerts ${fixtureAlertIds.join(
    ' and '
  )}. Return the final validated discovery.`,
};

export const liveRetrievalFixture = {
  alertCount: fixtureAlertIds.length,
  question: `Run Attack Discovery by retrieving alerts with the marker ${attackDiscoveryFixtureMarker} from the last six hours. Return the final validated discovery.`,
};

export const missingAlertRetrievalFixture = {
  alertCount: 0,
  question: `Run Attack Discovery by retrieving alerts with the marker ${attackDiscoveryFixtureMarker}-does-not-exist from the last six hours.`,
};

export const statusOnlyFixture = {
  alertCount: 0,
  executionUuid: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
  question: `What is the status of Attack Discovery execution a1b2c3d4-e5f6-7890-abcd-ef0123456789?`,
};

export const multipleAlertSetsFixture = {
  ids: fixtureAlertIds,
  alertCount: fixtureAlertIds.length,
  question: `Run Attack Discovery across the two provided alert sets ${fixtureAlertIds[0]} and ${fixtureAlertIds[1]}. Return the final validated discovery.`,
};

interface FixtureDocument {
  _id: string;
  source: Record<string, unknown>;
}

/**
 * The fixture's own alert documents.
 *
 * Every field a retrieval can be scoped by has to be reachable by the query
 * the example's question implies, and that query is not the fixture's choice:
 * the AD default retrieval query matches the marker against
 * `kibana.alert.rule.name`, `message`, `kibana.alert.rule.description` and
 * `process.command_line`, and keeps `message` in its projection. A fixture that
 * carries the marker only in `tags`/`workflow_tags`, `kibana.alert.reason` and
 * `kibana.alert.rule.uuid` is therefore UNREACHABLE for
 * `WHERE message LIKE "*<marker>*"` — the shape four of the five recorded
 * golden families wrote — and returns 0 rows against a population of 2. The
 * marker is seeded into `message` (the text field a marker search targets) so
 * the retrieval the exact-population assertion asks for is one a correct query
 * can actually perform.
 *
 * `kibana.alert.uuid` is the alert's OWN identity, distinct from the rule
 * identity (`kibana.alert.rule.uuid`, one value shared by both fixture alerts):
 * a retrieval that keeps no `_id` metadata still returns this column, so the
 * observed population stays countable by identity rather than by row count
 * (`extractAgentAlertRetrievalPopulation`).
 */
const createDocuments = (now: number = Date.now()): FixtureDocument[] => [
  {
    _id: fixtureAlertIds[0],
    source: {
      '@timestamp': new Date(now - 5 * 60 * 1000).toISOString(),
      event: { kind: 'signal', category: ['process'], type: ['start'] },
      host: { name: 'finance-ws-01' },
      process: { name: 'powershell.exe', command_line: 'powershell.exe -enc SQBFAFgA' },
      message: `Encoded PowerShell execution marker ${attackDiscoveryFixtureMarker}`,
      kibana: {
        alert: {
          uuid: fixtureAlertIds[0],
          rule: {
            name: 'AD2 encoded PowerShell fixture',
            uuid: `${attackDiscoveryFixtureMarker}-rule`,
          },
          severity: 'high',
          reason: `Encoded PowerShell execution marker ${attackDiscoveryFixtureMarker}`,
          risk_score: 75,
          workflow_status: 'open',
          building_block_type: null,
          tags: [attackDiscoveryFixtureMarker],
          workflow_tags: [attackDiscoveryFixtureMarker],
        },
      },
      tags: [attackDiscoveryFixtureMarker],
    },
  },
  {
    _id: fixtureAlertIds[1],
    source: {
      '@timestamp': new Date(now - 4 * 60 * 1000).toISOString(),
      event: { kind: 'signal', category: ['process'], type: ['access'] },
      host: { name: 'finance-ws-01' },
      process: { name: 'rundll32.exe' },
      target: { process: { name: 'lsass.exe' } },
      message: `LSASS access marker ${attackDiscoveryFixtureMarker}`,
      kibana: {
        alert: {
          uuid: fixtureAlertIds[1],
          rule: {
            name: 'AD2 LSASS access fixture',
            uuid: `${attackDiscoveryFixtureMarker}-rule`,
          },
          severity: 'critical',
          reason: `LSASS access marker ${attackDiscoveryFixtureMarker}`,
          risk_score: 99,
          workflow_status: 'open',
          building_block_type: null,
          tags: [attackDiscoveryFixtureMarker],
          workflow_tags: [attackDiscoveryFixtureMarker],
        },
      },
      tags: [attackDiscoveryFixtureMarker],
    },
  },
];

export const seedAttackDiscoveryFixtures = async (
  esClient: EsClient,
  fetch: HttpHandler
): Promise<void> => {
  await fetch('/api/detection_engine/index', { method: 'POST', version: '1' });
  const documents = createDocuments();
  await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap((document) => [
      { index: { _index: attackDiscoveryFixtureIndex, _id: document._id } },
      document.source,
    ]),
  });
};

export const cleanupAttackDiscoveryFixtures = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: attackDiscoveryFixtureIndex,
    // `tags` is mapped `keyword` directly on the alerts index — a `tags.keyword` term matches nothing.
    query: { term: { tags: attackDiscoveryFixtureMarker } },
    conflicts: 'proceed',
    refresh: true,
  });
};
