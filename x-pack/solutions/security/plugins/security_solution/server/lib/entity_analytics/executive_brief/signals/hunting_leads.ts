/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefEntityType,
  Severity,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { BriefSignal, EntityRef, FactDraft, LinkDraft } from './types';
import { getHuntingLeadsIndex } from './shared/indices';
import { isIndexNotFoundError } from './define_signal';

const MAX_LEADS = 10;
const MAX_RELATED_ENTITIES = 8;
const UNAVAILABLE_REASON = 'Hunting leads have never been generated';

interface LeadEntityDoc {
  id?: string;
  type?: string;
  name?: string;
}

interface LeadDoc {
  id?: string;
  title?: string;
  byline?: string;
  priority?: number;
  timestamp?: string;
  entity?: LeadEntityDoc;
  observations?: Array<{ type?: string }>;
  top_related_entities?: LeadEntityDoc[];
}

const toEntityType = (type: string | undefined): BriefEntityType =>
  type === 'user' || type === 'host' || type === 'service' ? type : 'generic';

const toEntityRef = (doc: LeadEntityDoc | undefined): EntityRef | undefined =>
  doc?.id && doc.name ? { euid: doc.id, type: toEntityType(doc.type), name: doc.name } : undefined;

/** Lead priority is 1..10. */
const toSeverity = (priority: number): Severity => {
  if (priority >= 9) {
    return 'critical';
  }
  if (priority >= 7) {
    return 'high';
  }
  return priority >= 4 ? 'medium' : 'low';
};

/** Top active hunting leads of the window, and the entities each lead is about. */
export const huntingLeadsSignal: BriefSignal<'tenant'> = {
  id: 'hunting_leads',
  title: 'Hunting leads',
  capability: 'hunting_leads',
  scope: 'tenant',
  isAvailable: async ({ esClient, spaceId }) => {
    try {
      const { count } = await esClient.count({ index: getHuntingLeadsIndex(spaceId) });
      return count > 0 ? { available: true } : { available: false, reason: UNAVAILABLE_REASON };
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return { available: false, reason: UNAVAILABLE_REASON };
      }
      throw error;
    }
  },
  run: async ({ esClient, spaceId, timeRange }, _input, abortSignal) => {
    const response = await esClient.search<LeadDoc>(
      {
        index: getHuntingLeadsIndex(spaceId),
        size: MAX_LEADS,
        _source: [
          'id',
          'title',
          'byline',
          'priority',
          'timestamp',
          'entity',
          'observations.type',
          'top_related_entities.id',
          'top_related_entities.type',
          'top_related_entities.name',
        ],
        sort: [{ priority: { order: 'desc' } }, { timestamp: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { status: 'active' } },
              { range: { timestamp: { gte: timeRange.from, lte: timeRange.to } } },
            ],
          },
        },
      },
      { signal: abortSignal }
    );

    const facts: FactDraft[] = [];
    const links: LinkDraft[] = [];
    const candidates = new Map<string, EntityRef>();

    response.hits.hits.forEach((hit) => {
      const lead = hit._source;
      const id = lead?.id ?? hit._id;
      const subject = toEntityRef(lead?.entity);
      if (!lead || !id || !lead.title || !subject) {
        return;
      }
      const related = (lead.top_related_entities ?? [])
        .map(toEntityRef)
        .filter(
          (entity): entity is EntityRef => entity !== undefined && entity.euid !== subject.euid
        )
        .slice(0, MAX_RELATED_ENTITIES);
      const leadEntities = [subject, ...related];
      const priority = lead.priority ?? 1;
      const observationTypes = [
        ...new Set((lead.observations ?? []).flatMap(({ type }) => (type ? [type] : []))),
      ].sort();

      const factIndex = facts.length;
      facts.push({
        kind: 'lead',
        title: lead.title,
        at: lead.timestamp,
        severity: toSeverity(priority),
        entities: leadEntities,
        numbers: { priority, observations: lead.observations?.length ?? 0 },
        details: {
          ...(lead.byline ? { summary: lead.byline } : {}),
          ...(observationTypes.length > 0 ? { observationTypes: observationTypes.join(', ') } : {}),
        },
        source: { type: 'lead', id, name: lead.title },
      });
      // A star from the lead's subject keeps the links bounded.
      for (const entity of related) {
        links.push({ type: 'same_lead', from: subject, to: entity, factIndexes: [factIndex] });
      }
      leadEntities.forEach((entity) => candidates.set(entity.euid, entity));
    });

    return { facts, links, candidates: [...candidates.values()] };
  },
};
