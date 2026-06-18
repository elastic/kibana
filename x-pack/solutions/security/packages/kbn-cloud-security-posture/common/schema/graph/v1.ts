/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const INDEX_PATTERN_REGEX = /^[^A-Z^\\/?"<>|\s#,]+$/;

// maxSize is set to 100 to match Security Solution resolver index pattern limits
export const INDEX_PATTERNS_MAX_SIZE = 100;

// maxSize is set to 5000 to align with graph events/entities ID batch limits
const PINNED_IDS_MAX_SIZE = 5000;
export const ORIGIN_EVENT_IDS_MAX_SIZE = 5000;
export const ENTITY_IDS_MAX_SIZE = 5000;

// maxSize is set to 100 for esQuery.bool clause arrays from the Kibana query builder
export const ES_BOOL_CLAUSE_MAX_SIZE = 100;

const indexPatternStringSchema = schema.string({
  minLength: 1,
  validate: (value) => {
    if (!INDEX_PATTERN_REGEX.test(value)) {
      return `Invalid index pattern: ${value}. Contains illegal characters.`;
    }
  },
});

/**
 * CPS project routing expressions accepted by the Graph API.
 * Values mirror `@kbn/cps-server-utils` (server-only package); declared here so the
 * shared-common schema can validate without depending on a server-side module.
 */
export const PROJECT_ROUTING_ORIGIN = '_alias:_origin' as const;
export const PROJECT_ROUTING_ALL = '_alias:*' as const;

export type ProjectRouting = typeof PROJECT_ROUTING_ORIGIN | typeof PROJECT_ROUTING_ALL;

/**
 * Entity ID for relationship queries.
 * isOrigin indicates whether this entity is the center/origin of the graph
 * (relevant when opening graph from entity flyout).
 */
export const entityIdSchema = schema.object({
  id: schema.string(),
  isOrigin: schema.boolean(),
});

export const graphRequestSchema = schema.object({
  nodesLimit: schema.maybe(schema.number()),
  showUnknownTarget: schema.maybe(schema.boolean()),
  query: schema.object({
    pinnedIds: schema.maybe(schema.arrayOf(schema.string(), { maxSize: PINNED_IDS_MAX_SIZE })),
    // Origin event IDs - optional, may be empty when opening from entity flyout
    originEventIds: schema.maybe(
      schema.arrayOf(schema.object({ id: schema.string(), isAlert: schema.boolean() }), {
        maxSize: ORIGIN_EVENT_IDS_MAX_SIZE,
      })
    ),
    // TODO: use zod for range validation instead of config schema
    start: schema.oneOf([schema.number(), schema.string()]),
    end: schema.oneOf([schema.number(), schema.string()]),
    indexPatterns: schema.maybe(
      schema.arrayOf(indexPatternStringSchema, {
        minSize: 1,
        maxSize: INDEX_PATTERNS_MAX_SIZE,
      })
    ),
    esQuery: schema.maybe(
      schema.object({
        bool: schema.object({
          filter: schema.maybe(
            schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
              maxSize: ES_BOOL_CLAUSE_MAX_SIZE,
            })
          ),
          must: schema.maybe(
            schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
              maxSize: ES_BOOL_CLAUSE_MAX_SIZE,
            })
          ),
          should: schema.maybe(
            schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
              maxSize: ES_BOOL_CLAUSE_MAX_SIZE,
            })
          ),
          must_not: schema.maybe(
            schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
              maxSize: ES_BOOL_CLAUSE_MAX_SIZE,
            })
          ),
        }),
      })
    ),
    // Entity IDs for fetching relationships from entity store (optional, may be empty when opening from events flyout)
    entityIds: schema.maybe(schema.arrayOf(entityIdSchema, { maxSize: ENTITY_IDS_MAX_SIZE })),
    // CPS project routing applied only to logs/events queries.
    // Alerts and entity-store enrichment are always pinned to the origin project.
    projectRouting: schema.maybe(
      schema.oneOf([schema.literal(PROJECT_ROUTING_ALL), schema.literal(PROJECT_ROUTING_ORIGIN)])
    ),
  }),
});

export const DOCUMENT_TYPE_EVENT = 'event' as const;
export const DOCUMENT_TYPE_ALERT = 'alert' as const;
export const DOCUMENT_TYPE_ENTITY = 'entity' as const;

export const entitySchema = schema.object({
  name: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  sub_type: schema.maybe(schema.string()),
  engine_type: schema.maybe(
    schema.oneOf([
      schema.literal('host'),
      schema.literal('user'),
      schema.literal('service'),
      schema.literal('generic'),
    ])
  ),
  host: schema.maybe(
    schema.object({
      // codeql[js/kibana/unbounded-array-in-schema] ES-derived entity detail in response body
      ip: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
  availableInEntityStore: schema.maybe(schema.boolean()),
  sourceFields: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const nodeDocumentDataSchema = schema.object({
  id: schema.string(),
  type: schema.oneOf([
    schema.literal(DOCUMENT_TYPE_EVENT),
    schema.literal(DOCUMENT_TYPE_ALERT),
    schema.literal(DOCUMENT_TYPE_ENTITY),
  ]),
  index: schema.maybe(schema.string()),
  event: schema.maybe(
    schema.object({
      id: schema.string(),
    })
  ),
  alert: schema.maybe(
    schema.object({
      ruleName: schema.maybe(schema.string()),
    })
  ),
  entity: schema.maybe(entitySchema),
});

export const REACHED_NODES_LIMIT = 'REACHED_NODES_LIMIT';

export const graphResponseSchema = () =>
  schema.object({
    // codeql[js/kibana/unbounded-array-in-schema] Server-built graph response from Elasticsearch, not user HTTP input
    nodes: schema.arrayOf(
      schema.oneOf([
        entityNodeDataSchema,
        groupNodeDataSchema,
        labelNodeDataSchema,
        relationshipNodeDataSchema,
      ])
    ),
    // codeql[js/kibana/unbounded-array-in-schema] Server-built graph response from Elasticsearch, not user HTTP input
    edges: schema.arrayOf(edgeDataSchema),
    messages: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Server-built graph response from Elasticsearch, not user HTTP input
      schema.arrayOf(schema.oneOf([schema.literal(REACHED_NODES_LIMIT)]))
    ),
  });

export const nodeColorSchema = schema.oneOf([
  schema.literal('primary'),
  schema.literal('danger'),
  schema.literal('warning'),
]);

export const edgeColorSchema = schema.oneOf([
  schema.literal('primary'),
  schema.literal('danger'),
  schema.literal('warning'),
  schema.literal('subdued'),
]);

export const nodeShapeSchema = schema.oneOf([
  schema.literal('hexagon'),
  schema.literal('pentagon'),
  schema.literal('ellipse'),
  schema.literal('rectangle'),
  schema.literal('diamond'),
  schema.literal('label'),
  schema.literal('group'),
  schema.literal('relationship'),
]);

export const nodeBaseDataSchema = schema.object({
  id: schema.string(),
  label: schema.maybe(schema.string()),
  icon: schema.maybe(schema.string()),
});

export const entityNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    color: nodeColorSchema,
    shape: schema.oneOf([
      schema.literal('hexagon'),
      schema.literal('pentagon'),
      schema.literal('ellipse'),
      schema.literal('rectangle'),
      schema.literal('diamond'),
    ]),
    tag: schema.maybe(schema.string()),
    count: schema.maybe(schema.number()),
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    ips: schema.maybe(schema.arrayOf(schema.string())),
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    countryCodes: schema.maybe(schema.arrayOf(schema.string())),
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    documentsData: schema.maybe(schema.arrayOf(nodeDocumentDataSchema)),
  }),
]);

export const groupNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    shape: schema.literal('group'),
  }),
]);

export const labelNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    shape: schema.literal('label'),
    parentId: schema.maybe(schema.string()),
    color: nodeColorSchema,
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    ips: schema.maybe(schema.arrayOf(schema.string())),
    count: schema.maybe(schema.number()),
    uniqueEventsCount: schema.maybe(schema.number()),
    uniqueAlertsCount: schema.maybe(schema.number()),
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    countryCodes: schema.maybe(schema.arrayOf(schema.string())),
    // codeql[js/kibana/unbounded-array-in-schema] ES-derived node fields in response body
    documentsData: schema.maybe(schema.arrayOf(nodeDocumentDataSchema)),
  }),
]);

export const relationshipNodeDataSchema = schema.allOf([
  nodeBaseDataSchema,
  schema.object({
    shape: schema.literal('relationship'),
    parentId: schema.maybe(schema.string()),
  }),
]);

export const edgeDataSchema = schema.object({
  id: schema.string(),
  source: schema.string(),
  target: schema.string(),
  color: edgeColorSchema,
  type: schema.maybe(schema.oneOf([schema.literal('solid'), schema.literal('dashed')])),
});
