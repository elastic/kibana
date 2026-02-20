/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { BoolQuery } from '@kbn/es-query';
import type {
  edgeColorSchema,
  edgeDataSchema,
  entityNodeDataSchema,
  graphRequestSchema,
  graphResponseSchema,
  groupNodeDataSchema,
  labelNodeDataSchema,
  relationshipNodeDataSchema,
  nodeColorSchema,
  nodeShapeSchema,
  nodeDocumentDataSchema,
  entitySchema,
} from '../../schema/graph/v1';
import { REACHED_NODES_LIMIT } from '../../schema/graph/v1';

export { DOCUMENT_TYPE_ALERT, DOCUMENT_TYPE_EVENT } from '../../schema/graph/v1';

export type GraphRequest = Omit<TypeOf<typeof graphRequestSchema>, 'query.esQuery'> & {
  query: { esQuery?: { bool: Partial<BoolQuery> } };
};
export type GraphResponse = Omit<TypeOf<typeof graphResponseSchema>, 'messages'> & {
  messages?: ApiMessageCode[];
};

export type EdgeColor = typeof edgeColorSchema.type;
export type NodeColor = typeof nodeColorSchema.type;

export type NodeShape = TypeOf<typeof nodeShapeSchema>;

export enum ApiMessageCode {
  // @ts-expect-error upgrade typescript v5.9.3
  ReachedNodesLimit = REACHED_NODES_LIMIT,
}

export type EntityNodeDataModel = TypeOf<typeof entityNodeDataSchema>;

export type EntityDetailsModel = TypeOf<typeof entitySchema>;

export type GroupNodeDataModel = TypeOf<typeof groupNodeDataSchema>;

export type LabelNodeDataModel = TypeOf<typeof labelNodeDataSchema>;

export type RelationshipNodeDataModel = TypeOf<typeof relationshipNodeDataSchema>;

export type EdgeDataModel = TypeOf<typeof edgeDataSchema>;

export type ConnectorNodeType = 'label' | 'relationship';

export type NodeDataModel =
  | EntityNodeDataModel
  | GroupNodeDataModel
  | LabelNodeDataModel
  | RelationshipNodeDataModel;

export type NodeDocumentDataModel = TypeOf<typeof nodeDocumentDataSchema>;

export type EntityDocumentDataModel = TypeOf<typeof entitySchema>;
