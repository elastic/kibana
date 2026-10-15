/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { FeatureUpsert, StreamQuery } from '@kbn/significant-events-schema';
import type {
  LabIncident,
  LabIncidentKind,
  LabScenarioIncident,
  LabState,
} from '../../../../common/detection_engine/types';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators/knowledge_indicator_client';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../../knowledge_indicators/data_stream';
import { LAB_LOGS_INDEX, LAB_SOURCE_TITLE } from '../constants';
import type { EngineStorage } from '../storage';
import { generateLabLogs, LAB_KNOWN_FAILURES } from './generate_lab_logs';

const LAB_SERVICES = ['frontend', 'checkout', 'payments', 'inventory'];
const LAB_DEPENDENCIES = [
  { source: 'frontend', target: 'checkout' },
  { source: 'checkout', target: 'payments' },
  { source: 'checkout', target: 'inventory' },
];
/** History written at setup, so baselines exist before the first live run. */
export const LAB_BACKFILL_MINUTES = 180;
/** Longest gap the lab fills in one go, so an idle lab does not write hours of logs at once. */
const MAX_GAP_MS = 4 * 60 * 60_000;

const KI_SEVERITY: Record<string, number> = {
  frontend: 55,
  checkout: 65,
  payments: 80,
  inventory: 70,
};

export const EMPTY_LAB: LabState = {
  ready: false,
  index: LAB_LOGS_INDEX,
  services: LAB_SERVICES,
  dependencies: LAB_DEPENDENCIES,
  incidents: [],
};

function labFeatures(): FeatureUpsert[] {
  return [
    ...LAB_SERVICES.map(
      (service): FeatureUpsert => ({
        id: `lab-entity-${service}`,
        type: 'entity',
        subtype: 'service',
        title: service,
        description: `Lab service ${service}.`,
        properties: { name: service },
        confidence: 100,
        tags: ['entity', 'service', 'detection-lab'],
        evidence: [`service.name=${service}`],
      })
    ),
    ...LAB_DEPENDENCIES.map(
      ({ source, target }): FeatureUpsert => ({
        id: `lab-dependency-${source}-${target}`,
        type: 'dependency',
        subtype: 'service_dependency',
        title: `${source} → ${target}`,
        description: `HTTP calls from ${source} to ${target}.`,
        properties: { source, target, protocol: 'http' },
        confidence: 100,
        tags: ['dependency', 'detection-lab'],
        evidence: [`service.name=${source}`, `peer.service=${target}`],
      })
    ),
  ];
}

function labQueries(viewName: string): StreamQuery[] {
  return LAB_SERVICES.map((service) => ({
    id: `lab-ki-${service}-known-failure`,
    title: `${service}: ${LAB_KNOWN_FAILURES[service]}`,
    description: `Known failure of ${service}, learned by the lab.`,
    type: 'match' as const,
    esql: {
      query: `FROM ${viewName}\n| WHERE \`service.name\` == "${service}" AND message LIKE "*${LAB_KNOWN_FAILURES[
        service
      ]
        .split(':')[0]
        .replace(/"/g, '')}*"`,
    },
    severity_score: KI_SEVERITY[service],
  }));
}

/** Lab operations for one space: setup, incidents, keeping logs flowing, reset. */
export interface LabService {
  get(): Promise<LabState>;
  /** Writes history, creates the lab source and its knowledge. Safe to run twice. */
  setup(): Promise<{ lab: LabState; docs: number; source: NightshiftSource }>;
  /** Writes logs from where the lab stopped up to `now`. */
  catchUp(now?: number): Promise<number>;
  startIncident(params: { kind: LabIncidentKind; service: string }): Promise<LabIncident>;
  stopIncident(id?: string): Promise<LabState>;
  reset(): Promise<void>;
  /**
   * Rewrites the lab logs as a labelled timeline ending now: normal traffic with the given
   * incidents in the past. Used to compare pipelines on identical data.
   */
  loadScenario(params: {
    backfillMinutes: number;
    incidents: LabScenarioIncident[];
  }): Promise<{ lab: LabState; docs: number; source: NightshiftSource; endsAt: string }>;
}

/** Creates the lab service for one space. */
export function createLabService({
  esClient,
  storage,
  sourcesClient,
  getKnowledgeIndicatorClient,
}: {
  esClient: ElasticsearchClient;
  storage: EngineStorage;
  sourcesClient: SourcesClient;
  getKnowledgeIndicatorClient: (source: NightshiftSource) => Promise<KnowledgeIndicatorClient>;
}): LabService {
  const get = async (): Promise<LabState> => (await storage.getState('lab')) ?? EMPTY_LAB;

  const findSource = async (sourceId?: string): Promise<NightshiftSource | undefined> => {
    if (sourceId) {
      const found = await sourcesClient.get(sourceId).catch(() => undefined);
      if (found) {
        return found.source;
      }
    }
    // Free-text search does not match titles reliably, so filter the catalog instead.
    const { sources } = await sourcesClient.list({ page: 1, perPage: 1000 });
    return sources.find((source) => source.title === LAB_SOURCE_TITLE);
  };

  /**
   * Creates the lab source and its knowledge when missing. Existing KIs are left alone, so a
   * query someone promoted to a rule stays promoted.
   */
  const ensureSourceAndKnowledge = async (sourceId?: string): Promise<NightshiftSource> => {
    const source =
      (await findSource(sourceId)) ??
      (await sourcesClient.create({
        title: LAB_SOURCE_TITLE,
        description:
          'Synthetic logs for four services (frontend, checkout, payments, inventory), written by the detection engine lab.',
        tags: ['detection-lab'],
        esql: `FROM ${LAB_LOGS_INDEX}`,
      }));
    if (!source.enabled) {
      await sourcesClient.setEnabled(source.id, true);
    }

    const kiClient = await getKnowledgeIndicatorClient(source);
    const existing = await kiClient.getQueryLinks([source.id], { ruleUnbacked: 'include' });
    const existingIds = new Set(existing.map((link) => link.query.id));
    const missingQueries = labQueries(source.view_name).filter(
      (query) => !existingIds.has(query.id)
    );
    await kiClient.bulk(source.id, [
      ...labFeatures().map((feature) => ({ index: { feature } })),
      // Unbacked: the KI rules strategy counts matches itself, so no Alerting v2 rule is needed,
      // and a backed query whose rule is missing gets tombstoned by reconciliation.
      ...missingQueries.map((query) => ({ index: { query: { ...query, rule_backed: false } } })),
    ]);
    // Replay reads these KIs right after setup, before the next periodic refresh.
    await esClient.indices.refresh({ index: KNOWLEDGE_INDICATORS_DATA_STREAM });
    return source;
  };

  const service: LabService = {
    get,

    async setup() {
      await storage.ensure();
      const current = await get();
      const now = Date.now();
      const from = current.generated_until
        ? Math.max(Date.parse(current.generated_until), now - MAX_GAP_MS)
        : now - LAB_BACKFILL_MINUTES * 60_000;
      const base: LabState = { ...EMPTY_LAB, ...current, incidents: current.incidents ?? [] };
      // The source query must run when the source is created, so logs come first.
      const docs = await generateLabLogs({ esClient, lab: base, from, to: now });

      const source = await ensureSourceAndKnowledge(current.source_id);

      const lab: LabState = {
        ...base,
        ready: true,
        source_id: source.id,
        generated_until: new Date(now).toISOString(),
      };
      await storage.putState('lab', lab);
      await storage.appendActivity([
        {
          step: 'lab',
          action: 'setup',
          message: `Lab ready: ${docs} log lines written, source "${source.title}" with ${LAB_SERVICES.length} services, ${LAB_DEPENDENCIES.length} dependencies and ${LAB_SERVICES.length} KI queries.`,
        },
      ]);
      return { lab, docs, source };
    },

    async catchUp(now = Date.now()) {
      const lab = await get();
      if (!lab.ready) {
        return 0;
      }
      const from = Math.max(
        Date.parse(lab.generated_until ?? new Date(now).toISOString()),
        now - MAX_GAP_MS
      );
      if (now <= from) {
        return 0;
      }
      const docs = await generateLabLogs({ esClient, lab, from, to: now });
      await storage.putState('lab', { ...lab, generated_until: new Date(now).toISOString() });
      return docs;
    },

    async startIncident({ kind, service: incidentService }) {
      const lab = await get();
      // Logs up to now are normal; the incident shapes everything written after this point.
      await service.catchUp();
      const incident: LabIncident = {
        id: uuidv4(),
        kind,
        service: incidentService,
        started_at: new Date().toISOString(),
      };
      const updated = await get();
      await storage.putState('lab', { ...updated, incidents: [...lab.incidents, incident] });
      await storage.appendActivity([
        {
          step: 'lab',
          action: 'incident_started',
          service: incidentService,
          message: `Lab incident started: ${kind.replace(/_/g, ' ')} on ${incidentService}.`,
        },
      ]);
      return incident;
    },

    async stopIncident(id) {
      await service.catchUp();
      const lab = await get();
      const stopped = lab.incidents.filter((incident) => id === undefined || incident.id === id);
      const next = {
        ...lab,
        incidents: lab.incidents.filter((incident) => !stopped.includes(incident)),
      };
      await storage.putState('lab', next);
      await storage.appendActivity(
        stopped.map((incident) => ({
          step: 'lab' as const,
          action: 'incident_stopped',
          service: incident.service,
          message: `Lab incident stopped: ${incident.kind.replace(/_/g, ' ')} on ${
            incident.service
          }.`,
        }))
      );
      return next;
    },

    async loadScenario({ backfillMinutes, incidents }) {
      await storage.ensure();
      const current = await get();
      const now = Date.now();
      const timeline: LabIncident[] = incidents.map((incident) => ({
        id: uuidv4(),
        kind: incident.kind,
        service: incident.service,
        started_at: new Date(now - incident.start_minutes_ago * 60_000).toISOString(),
        ended_at: new Date(now - incident.end_minutes_ago * 60_000).toISOString(),
      }));
      await esClient.indices.deleteDataStream({ name: LAB_LOGS_INDEX }, { ignore: [404] });
      const base: LabState = { ...EMPTY_LAB, source_id: current.source_id, incidents: timeline };
      const docs = await generateLabLogs({
        esClient,
        lab: base,
        from: now - backfillMinutes * 60_000,
        to: now,
      });
      const source = await ensureSourceAndKnowledge(current.source_id);
      const lab: LabState = {
        ...base,
        ready: true,
        source_id: source.id,
        // Every scenario incident has ended; logs written from here on are normal.
        incidents: [],
        generated_until: new Date(now).toISOString(),
      };
      await storage.putState('lab', lab);
      await storage.appendActivity([
        {
          step: 'lab',
          action: 'scenario_loaded',
          message: `Scenario loaded: ${docs} log lines over ${backfillMinutes} minutes with ${
            timeline.length
          } incident(s): ${timeline
            .map(
              (incident) =>
                `${incident.kind.replace(/_/g, ' ')} on ${incident.service} ${new Date(
                  incident.started_at
                ).toISOString()} - ${incident.ended_at}`
            )
            .join('; ')}.`,
        },
      ]);
      return { lab, docs, source, endsAt: new Date(now).toISOString() };
    },

    async reset() {
      await esClient.indices.deleteDataStream({ name: LAB_LOGS_INDEX }, { ignore: [404] });
      await storage.clear();
    },
  };

  return service;
}
