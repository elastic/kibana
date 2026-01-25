/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { fetchGraph, fetchEntityRelationships } from './fetch_graph';
import type { EsQuery, EntityId, OriginEventId } from './types';
import { parseRecords } from './parse_records';

interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface GetGraphParams {
  services: GraphContextServices;
  query: {
    originEventIds: OriginEventId[];
    indexPatterns?: string[];
    spaceId?: string;
    start: string | number;
    end: string | number;
    esQuery?: EsQuery;
    entityIds?: EntityId[];
  };
  showUnknownTarget: boolean;
  nodesLimit?: number;
}

export const getGraph = async ({
  services: { esClient, logger },
  query: { originEventIds, spaceId = 'default', indexPatterns, start, end, esQuery, entityIds },
  showUnknownTarget,
  nodesLimit,
}: GetGraphParams): Promise<Pick<GraphResponse, 'nodes' | 'edges' | 'messages'>> => {
  indexPatterns = indexPatterns ?? [`.alerts-security.alerts-${spaceId}`, 'logs-*'];

  logger.trace(
    `Fetching graph for [originEventIds: ${originEventIds
      .map((e) => e.id)
      .join(', ')}] in [spaceId: ${spaceId}] [indexPatterns: ${indexPatterns.join(',')}]`
  );

  // Fetch events (existing logic)
  const eventResultsPromise = fetchGraph({
    esClient,
    showUnknownTarget,
    logger,
    start,
    end,
    originEventIds,
    indexPatterns,
    spaceId,
    esQuery,
  });

  // Optionally fetch relationships in parallel when entityIds are provided
  const hasEntityIds = entityIds && entityIds.length > 0;

  // relationships-test-target-1, relationships-test-target-2, standalone-entity-1
  const relationshipResultsPromise = hasEntityIds
    ? fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId,
      })
    : Promise.resolve([]);

  // Wait for both in parallel
  const [eventResults, relationshipResults] = await Promise.all([
    eventResultsPromise,
    relationshipResultsPromise,
  ]);

  logger.trace(
    `Fetched [events: ${eventResults.records.length}] [relationships: ${relationshipResults.length}]`
  );

  const data = parseRecords(logger, eventResults.records, relationshipResults, nodesLimit);
  return data;

  // return {
  //   "nodes": [
  //     {
  //       "id": "actor-1",
  //       "color": "primary",
  //       "label": "actor-1",
  //       "documentsData": [
  //         {
  //           "id": "actor-1",
  //           "type": "entity",
  //           "entity": {
  //             "availableInEntityStore": false,
  //             "ecsParentField": "service"
  //           }
  //         }
  //       ],
  //       "shape": "rectangle",
  //       "icon": "magnifyWithExclamation",
  //       "tag": "Entity"
  //     },
  //     {
  //       "id": "target-1",
  //       "color": "primary",
  //       "label": "Target 1",
  //       "documentsData": [
  //         {
  //           "id": "target-1",
  //           "type": "entity",
  //           "entity": {
  //             "name": "Target 1",
  //             "type": "Service",
  //             "availableInEntityStore": true,
  //             "ecsParentField": "entity"
  //           }
  //         }
  //       ],
  //       "shape": "rectangle",
  //       "icon": "cloudStormy",
  //       "tag": "Service"
  //     },
  //     {
  //       "id": "a(actor-1)-b(target-1)label(AssumeRole1)oe(1)oa(0)",
  //       "label": "AssumeRole1",
  //       "color": "primary",
  //       "shape": "label",
  //       "documentsData": [
  //         {
  //           "id": "AZvgVe3mpkOr50X83RIg",
  //           "event": {
  //             "id": "71287b7b-4c23-30e3-840d-f2af32d65c6b12"
  //           },
  //           "type": "event",
  //           "index": ".ds-logs-aws.cloudtrail-default-2026.01.20-000001"
  //         }
  //       ],
  //       "count": 1,
  //       "uniqueEventsCount": 1
  //     },
  //     {
  //       "id": "arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer",
  //       "color": "primary",
  //       "label": "arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer",
  //       "documentsData": [
  //         {
  //           "id": "arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer",
  //           "type": "entity",
  //           "entity": {
  //             "name": "arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer",
  //             "type": "Service Account",
  //             "sub_type": "AWS IAM Role",
  //             "availableInEntityStore": true,
  //             "ecsParentField": "service"
  //           }
  //         }
  //       ],
  //       "shape": "ellipse",
  //       "icon": "user",
  //       "tag": "Service Account"
  //     },
  //     {
  //       "id": "a(actor-1)-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)label(AssumeRole1)oe(1)oa(0)",
  //       "label": "AssumeRole1",
  //       "color": "primary",
  //       "shape": "label",
  //       "documentsData": [
  //         {
  //           "id": "AZvgVe3mpkOr50X83RIg",
  //           "event": {
  //             "id": "71287b7b-4c23-30e3-840d-f2af32d65c6b12"
  //           },
  //           "type": "event",
  //           "index": ".ds-logs-aws.cloudtrail-default-2026.01.20-000001"
  //         }
  //       ],
  //       "count": 1,
  //       "uniqueEventsCount": 1
  //     },
  //     {
  //       "id": "host-1",
  //       "label": "host-1",
  //       "shape": "ellipse",
  //       "color": "primary"
  //     },
  //     {
  //       "id": "a(target-1)-b(host-1)rel(Communicates_with)",
  //       "label": "Communicates with",
  //       "shape": "relationship"
  //     },
  //     {
  //       "id": "host-2",
  //       "label": "host-2",
  //       "shape": "ellipse",
  //       "color": "primary"
  //     },
  //     {
  //       "id": "a(target-1)-b(host-2)rel(Communicates_with)",
  //       "label": "Communicates with",
  //       "shape": "relationship"
  //     },
  //     {
  //       "id": "host-3",
  //       "label": "host-3",
  //       "shape": "ellipse",
  //       "color": "primary"
  //     },
  //     {
  //       "id": "a(target-1)-b(host-3)rel(Communicates_with)",
  //       "label": "Communicates with",
  //       "shape": "relationship"
  //     }
  //   ],
  //   "edges": [
  //     {
  //       "id": "a(actor-1)-b(a(actor-1)-b(target-1)label(AssumeRole1)oe(1)oa(0))",
  //       "source": "actor-1",
  //       "target": "a(actor-1)-b(target-1)label(AssumeRole1)oe(1)oa(0)",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(a(actor-1)-b(target-1)label(AssumeRole1)oe(1)oa(0))-b(target-1)",
  //       "source": "a(actor-1)-b(target-1)label(AssumeRole1)oe(1)oa(0)",
  //       "target": "target-1",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(actor-1)-b(a(actor-1)-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)label(AssumeRole1)oe(1)oa(0))",
  //       "source": "actor-1",
  //       "target": "a(actor-1)-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)label(AssumeRole1)oe(1)oa(0)",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(a(actor-1)-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)label(AssumeRole1)oe(1)oa(0))-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)",
  //       "source": "a(actor-1)-b(arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer)label(AssumeRole1)oe(1)oa(0)",
  //       "target": "arn:aws:iam::704479110758:role/aws-service-role/access-analyzer.amazonaws.com/AWSServiceRoleForAccessAnalyzer",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(target-1)-b(a(target-1)-b(host-1)rel(Communicates_with))",
  //       "source": "target-1",
  //       "target": "a(target-1)-b(host-1)rel(Communicates_with)",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(a(target-1)-b(host-1)rel(Communicates_with))-b(host-1)",
  //       "source": "a(target-1)-b(host-1)rel(Communicates_with)",
  //       "target": "host-1",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(target-1)-b(a(target-1)-b(host-2)rel(Communicates_with))",
  //       "source": "target-1",
  //       "target": "a(target-1)-b(host-2)rel(Communicates_with)",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(a(target-1)-b(host-2)rel(Communicates_with))-b(host-2)",
  //       "source": "a(target-1)-b(host-2)rel(Communicates_with)",
  //       "target": "host-2",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(target-1)-b(a(target-1)-b(host-3)rel(Communicates_with))",
  //       "source": "target-1",
  //       "target": "a(target-1)-b(host-3)rel(Communicates_with)",
  //       "color": "subdued",
  //       "type": "solid"
  //     },
  //     {
  //       "id": "a(a(target-1)-b(host-3)rel(Communicates_with))-b(host-3)",
  //       "source": "a(target-1)-b(host-3)rel(Communicates_with)",
  //       "target": "host-3",
  //       "color": "subdued",
  //       "type": "solid"
  //     }
  //   ]
  // }
};
