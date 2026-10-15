/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { LabIncident, LabState } from '../../../../common/detection_engine/types';

/** One log line every this many milliseconds per service; about 24 lines a minute. */
const SLOT_MS = 2_500;
const BULK_CHUNK = 5_000;
const NANOS_PER_MS = 1_000_000;

/** Messages the lab's KI queries match. Each also shows up rarely in normal traffic. */
export const LAB_KNOWN_FAILURES: Record<string, string> = {
  frontend: 'Upstream checkout returned 503 Service Unavailable',
  checkout: 'Failed to reserve stock: inventory unavailable',
  payments: 'Payment gateway timeout after 3000ms',
  inventory: 'Database connection refused: inventory-db:5432',
};

const NORMAL_MESSAGES: Record<string, string[]> = {
  frontend: ['GET /cart 200', 'GET /product/{id} 200', 'GET / 200'],
  checkout: ['Order {id} placed', 'Cart {id} priced', 'Shipping quote computed for order {id}'],
  payments: ['Payment {id} authorized', 'Refund {id} processed', 'Card token {id} validated'],
  inventory: ['Stock level read for sku {id}', 'Reservation {id} confirmed', 'Restock event {id}'],
};

const BASE_LATENCY_MS: Record<string, number> = {
  frontend: 120,
  checkout: 90,
  payments: 150,
  inventory: 40,
};

const NOVEL_ERROR = 'TLS handshake failed: certificate has expired (CN=api.bank.example)';

/** Probability that a normal line is an unrelated error, so ratios are never perfectly flat. */
const BACKGROUND_ERROR_RATE = 0.01;
/** Probability that a normal line is the service's known failure, so KI rules have a baseline. */
const BACKGROUND_KNOWN_FAILURE_RATE = 0.003;

interface LabDoc {
  '@timestamp': string;
  'service.name': string;
  'log.level': string;
  message: string;
  'http.response.status_code': number;
  'event.duration': number;
  'host.name': string;
}

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function fillId(template: string): string {
  return template.replace('{id}', String(Math.floor(Math.random() * 100_000)));
}

function activeIncidents(incidents: LabIncident[], service: string, at: number) {
  return incidents.filter(
    (incident) =>
      incident.service === service &&
      Date.parse(incident.started_at) <= at &&
      (incident.ended_at === undefined || at < Date.parse(incident.ended_at))
  );
}

/**
 * One log line, shaped by the incidents active at that moment. An error spike on a service also
 * hurts the services that call it, so related symptoms appear across the dependency graph.
 */
function generateDoc(service: string, at: number, lab: LabState): LabDoc | undefined {
  const own = activeIncidents(lab.incidents, service, at);
  if (own.some((incident) => incident.kind === 'silence')) {
    return undefined;
  }

  const calledFailing = lab.dependencies
    .filter((dependency) => dependency.source === service)
    .filter((dependency) =>
      activeIncidents(lab.incidents, dependency.target, at).some(
        (incident) => incident.kind === 'error_spike' || incident.kind === 'silence'
      )
    );

  const slow = own.some((incident) => incident.kind === 'latency');
  const baseLatency = BASE_LATENCY_MS[service] ?? 100;
  const latencyMs = baseLatency * (0.6 + Math.random() * 0.8) * (slow ? 8 : 1);
  const host = `${service}-${1 + Math.floor(Math.random() * 3)}`;
  const base = {
    '@timestamp': new Date(at).toISOString(),
    'service.name': service,
    'event.duration': Math.round(latencyMs * NANOS_PER_MS),
    'host.name': host,
  };
  const error = (message: string, status = 500): LabDoc => ({
    ...base,
    'log.level': 'error',
    message,
    'http.response.status_code': status,
  });

  const roll = Math.random();
  if (own.some((incident) => incident.kind === 'error_spike') && roll < 0.45) {
    return error(LAB_KNOWN_FAILURES[service] ?? `${service} request failed`);
  }
  if (own.some((incident) => incident.kind === 'new_error') && roll < 0.3) {
    return error(NOVEL_ERROR, 502);
  }
  if (calledFailing.length > 0 && roll < 0.25) {
    const target = calledFailing[0].target;
    return error(`Call to ${target} failed: upstream timeout`, 504);
  }
  if (roll < BACKGROUND_KNOWN_FAILURE_RATE) {
    return error(LAB_KNOWN_FAILURES[service] ?? `${service} request failed`);
  }
  if (roll < BACKGROUND_KNOWN_FAILURE_RATE + BACKGROUND_ERROR_RATE) {
    return error(`Request validation failed for user ${Math.floor(Math.random() * 10_000)}`, 400);
  }
  return {
    ...base,
    'log.level': 'info',
    message: fillId(pick(NORMAL_MESSAGES[service] ?? ['request handled'])),
    'http.response.status_code': 200,
  };
}

/** Writes lab logs for [from, to) and returns how many lines it wrote. */
export async function generateLabLogs({
  esClient,
  lab,
  from,
  to,
}: {
  esClient: ElasticsearchClient;
  lab: LabState;
  from: number;
  to: number;
}): Promise<number> {
  const slots = Math.max(0, Math.floor((to - from) / SLOT_MS));
  const docs = Array.from({ length: slots }, (_, index) => from + index * SLOT_MS).flatMap((at) =>
    lab.services.flatMap((service) => {
      // Spread lines inside the slot so buckets do not all start on the same millisecond.
      const doc = generateDoc(service, at + Math.floor(Math.random() * SLOT_MS), lab);
      return doc ? [doc] : [];
    })
  );

  const chunks = Array.from({ length: Math.ceil(docs.length / BULK_CHUNK) }, (_, index) =>
    docs.slice(index * BULK_CHUNK, (index + 1) * BULK_CHUNK)
  );
  // Sequential so a large backfill does not flood the bulk queue.
  for (const chunk of chunks) {
    const response = await esClient.bulk({
      index: lab.index,
      operations: chunk.flatMap((doc) => [{ create: {} }, doc]),
    });
    if (response.errors) {
      const firstError = response.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(`Writing lab logs failed: ${JSON.stringify(firstError)}`);
    }
  }
  await esClient.indices.refresh({ index: lab.index });
  return docs.length;
}
