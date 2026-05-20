/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const INDEX_PATTERN_REGEX = /^[^A-Z^\\/?"<>|\s#,]+$/;

const PINNED_IDS_MAX_SIZE = 1024;

// maxSize is set to 100 to match Security Solution resolver index pattern limits
export const INDEX_PATTERNS_MAX_SIZE = 100;

// maxSize is set to 5000 to align with graph events/entities ID batch limits
export const ORIGIN_EVENT_IDS_MAX_SIZE = 5000;
export const ENTITY_IDS_MAX_SIZE = 5000;

// maxSize is set to 100 for esQuery.bool clause arrays from the Kibana query builder
export const ES_BOOL_CLAUSE_MAX_SIZE = 100;

// maxSize is set to 300 to match GRAPH_NODES_LIMIT used by the graph UI
export const GRAPH_NODES_MAX_SIZE = 300;
export const GRAPH_EDGES_MAX_SIZE = 1000;
export const GRAPH_MESSAGES_MAX_SIZE = 5;

// maxSize is set to 100 to match page.size max on graph events/entities requests
export const GRAPH_PAGE_ITEMS_MAX_SIZE = 100;

export const NODE_IPS_MAX_SIZE = 256;
export const NODE_COUNTRY_CODES_MAX_SIZE = 100;
export const NODE_DOCUMENTS_DATA_MAX_SIZE = 5000;

const indexPatternStringSchema = schema.string({
  minLength: 1,
  validate: (value) => {
    if (!INDEX_PATTERN_REGEX.test(value)) {
      return `Invalid index pattern: ${value}. Contains illegal characters.`;
    }
  },
});

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
      ip: schema.maybe(schema.arrayOf(schema.string(), { maxSize: NODE_IPS_MAX_SIZE })),
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
    nodes: schema.arrayOf(
      schema.oneOf([
        entityNodeDataSchema,
        groupNodeDataSchema,
        labelNodeDataSchema,
        relationshipNodeDataSchema,
      ]),
      { maxSize: GRAPH_NODES_MAX_SIZE }
    ),
    edges: schema.arrayOf(edgeDataSchema, { maxSize: GRAPH_EDGES_MAX_SIZE }),
    messages: schema.maybe(
      schema.arrayOf(schema.oneOf([schema.literal(REACHED_NODES_LIMIT)]), {
        maxSize: GRAPH_MESSAGES_MAX_SIZE,
      })
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
    ips: schema.maybe(schema.arrayOf(schema.string(), { maxSize: NODE_IPS_MAX_SIZE })),
    countryCodes: schema.maybe(
      schema.arrayOf(schema.string(), { maxSize: NODE_COUNTRY_CODES_MAX_SIZE })
    ),
    documentsData: schema.maybe(
      schema.arrayOf(nodeDocumentDataSchema, { maxSize: NODE_DOCUMENTS_DATA_MAX_SIZE })
    ),
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
    ips: schema.maybe(schema.arrayOf(schema.string(), { maxSize: NODE_IPS_MAX_SIZE })),
    count: schema.maybe(schema.number()),
    uniqueEventsCount: schema.maybe(schema.number()),
    uniqueAlertsCount: schema.maybe(schema.number()),
    countryCodes: schema.maybe(
      schema.arrayOf(schema.string(), { maxSize: NODE_COUNTRY_CODES_MAX_SIZE })
    ),
    documentsData: schema.maybe(
      schema.arrayOf(nodeDocumentDataSchema, { maxSize: NODE_DOCUMENTS_DATA_MAX_SIZE })
    ),
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
