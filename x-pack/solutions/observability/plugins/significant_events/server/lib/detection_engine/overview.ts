/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { PriceResult } from '../cost/price_service';
import { emptyLedger, resolveModelKey, toPricePerMillion } from './cost';
import type {
  DetectionStrategyId,
  EngineOverviewResponse,
  ServiceSummary,
} from '../../../common/detection_engine/types';
import { DETECTION_STRATEGY_IDS } from '../../../common/detection_engine/types';
import { EMPTY_LAB } from './lab/lab_service';
import { proposeStrategyChanges, scoreStrategies } from './learning';
import type { EngineStorage } from './storage';
import { STRATEGIES } from './strategies/strategy_registry';
import { ENGINE_INDICES } from './constants';

const HOUR_MS = 60 * 60_000;
const OPEN_STATUSES = ['active', 'recovering'];

/** Everything the detection page shows at a glance. */
export async function buildOverview({
  storage,
  inferenceClient,
  getPrices,
}: {
  storage: EngineStorage;
  inferenceClient: InferenceClient;
  getPrices: () => Promise<PriceResult | null>;
}): Promise<EngineOverviewResponse> {
  await storage.ensure();
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  const [
    config,
    lastRun,
    lab,
    events,
    detections,
    verifierActivity,
    detectionsLastHour,
    ledger,
    prices,
  ] = await Promise.all([
    storage.getConfig(),
    storage.getState('last_run'),
    storage.getState('lab'),
    storage.searchEvents({ size: 1000 }),
    storage.searchDetections({ size: 5000 }),
    storage.searchActivity({ step: 'verifier', size: 1000 }),
    storage.countDetections({ from: new Date(now - HOUR_MS).toISOString() }),
    storage.getState('cost'),
    getPrices(),
  ]);

  const verifierFailures = new Map<string, number>();
  verifierActivity
    .filter((entry) => entry.action === 'does_not_hold' && entry.event_id)
    .forEach((entry) =>
      verifierFailures.set(entry.event_id!, (verifierFailures.get(entry.event_id!) ?? 0) + 1)
    );

  const scorecards = scoreStrategies({ detections, events, verifierFailures });
  const model =
    config.agent.kind === 'llm' && config.agent.connector_id
      ? await resolveModelKey({ inferenceClient, connectorId: config.agent.connector_id })
      : undefined;
  const modelPrice = model ? prices?.prices.get(model) : undefined;
  const currentLedger = ledger ?? emptyLedger(new Date(now).toISOString());

  return {
    config,
    strategies: DETECTION_STRATEGY_IDS.map((id) => ({
      ...STRATEGIES[id].descriptor,
      config: config.strategies[id],
      scorecard: scorecards[id],
      opened_today: events.filter(
        (event) => event.origin_strategy === id && event.created_at >= dayStart.toISOString()
      ).length,
    })),
    proposals: proposeStrategyChanges({ config, scorecards }),
    last_run: lastRun,
    last_evaluated_bucket_end: lastRun?.last_evaluated_bucket_end,
    counts: {
      open_events: events.filter((event) => OPEN_STATUSES.includes(event.status)).length,
      events: events.length,
      detections_last_hour: detectionsLastHour,
    },
    lab: lab ?? EMPTY_LAB,
    cost: {
      ledger: currentLedger,
      today_usd: currentLedger.by_day[new Date(now).toISOString().slice(0, 10)]?.usd ?? 0,
      current_price: model && modelPrice ? toPricePerMillion(model, modelPrice) : undefined,
      prices_available: prices !== null,
      prices_fetched_at: prices?.fetchedAt,
    },
  };
}

/** Everything the engine watches and found, organised by service. */
export async function listServices({
  storage,
  esClient,
}: {
  storage: EngineStorage;
  esClient: ElasticsearchClient;
}): Promise<ServiceSummary[]> {
  await storage.ensure();
  const since = new Date(Date.now() - HOUR_MS).toISOString();

  const response = await esClient.search({
    index: ENGINE_INDICES.observations,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { space_id: storage.spaceId } },
          { range: { bucket_start: { gte: since } } },
        ],
      },
    },
    aggs: {
      services: {
        terms: { field: 'service', size: 500 },
        aggs: {
          strategies: {
            terms: { field: 'strategy', size: 10 },
            aggs: { series: { cardinality: { field: 'fingerprint' } } },
          },
        },
      },
    },
  });

  interface ServiceBucket {
    key: string;
    strategies: { buckets: Array<{ key: string; series: { value: number } }> };
  }
  const buckets =
    (response.aggregations?.services as { buckets: ServiceBucket[] } | undefined)?.buckets ?? [];

  const [events, detections] = await Promise.all([
    storage.searchEvents({ size: 1000 }),
    storage.searchDetections({ from: since, size: 5000 }),
  ]);

  const services = new Set([
    ...buckets.map((bucket) => bucket.key),
    ...events.flatMap((event) => event.services),
  ]);

  return [...services].sort().map((service) => {
    const bucket = buckets.find((item) => item.key === service);
    const serviceEvents = events.filter((event) => event.services.includes(service));
    return {
      service,
      watched_by: (bucket?.strategies.buckets ?? []).map((strategyBucket) => ({
        strategy: strategyBucket.key as DetectionStrategyId,
        series: strategyBucket.series.value,
      })),
      detections_last_hour: detections.filter((detection) => detection.service === service).length,
      open_events: serviceEvents.filter((event) => OPEN_STATUSES.includes(event.status)).length,
      last_event_title: serviceEvents[0]?.title,
    };
  });
}
