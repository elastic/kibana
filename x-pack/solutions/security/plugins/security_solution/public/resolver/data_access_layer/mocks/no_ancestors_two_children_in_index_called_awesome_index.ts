/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverNode,
  ResolverSchema,
} from '../../../../common/endpoint/types';
import { mockEndpointEvent } from '../../mocks/endpoint_event';
import { mockTreeWithNoAncestorsAnd2Children } from '../../mocks/resolver_tree';
import type { DataAccessLayer, TimeRange } from '../../types';

interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: {
    /**
     * The entityID of the node related to the document being analyzed.
     */
    origin: 'origin';
    /**
     * The entityID of the first child of the origin.
     */
    firstChild: 'firstChild';
    /**
     * The entityID of the second child of the origin.
     */
    secondChild: 'secondChild';
  };
}

/**
 * A mock DataAccessLayer that will return an origin in two children. The `entity` response will be empty unless
 * `awesome_index` is passed in the indices array.
 */
export function noAncestorsTwoChildenInIndexCalledAwesomeIndex(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents({
        entityID,
        timeRange,
        indexPatterns,
      }: {
        entityID: string;
        timeRange?: TimeRange;
        indexPatterns: string[];
      }): Promise<ResolverRelatedEvents> {
        return Promise.resolve({
          entityID,
          events: [
            mockEndpointEvent({
              entityID,
              processName: 'event',
              timestamp: 0,
            }),
          ],
          nextEvent: null,
        });
      },

      async eventsWithEntityIDAndCategory({
        entityID,
        category,
        after,
        timeRange,
        indexPatterns,
      }: {
        entityID: string;
        category: string;
        after?: string;
        timeRange?: TimeRange;
        indexPatterns: string[];
      }): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        return {
          events: [
            mockEndpointEvent({
              entityID,
              eventCategory: category,
            }),
          ],
          nextEvent: null,
        };
      },

      async event({
        nodeID,
        eventID,
        eventCategory,
        eventTimestamp,
        winlogRecordID,
        timeRange,
        indexPatterns,
      }: {
        nodeID: string;
        eventCategory: string[];
        eventTimestamp: string;
        eventID?: string | number;
        winlogRecordID: string;
        timeRange?: TimeRange;
        indexPatterns: string[];
      }): Promise<SafeResolverEvent | null> {
        return mockEndpointEvent({
          entityID: metadata.entityIDs.origin,
          eventID,
        });
      },

      /**
       * Creates a fake event for each of the ids requested
       */
      async nodeData({
        ids,
        timeRange,
        indexPatterns,
        limit,
        agentId,
      }: {
        ids: string[];
        timeRange: TimeRange;
        indexPatterns: string[];
        limit: number;
        agentId: string;
      }): Promise<SafeResolverEvent[]> {
        return ids.map((id: string) =>
          mockEndpointEvent({
            entityID: id,
          })
        );
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree({
        dataId,
        schema,
        timeRange,
        indices,
        ancestors,
        descendants,
        agentId,
      }: {
        dataId: string;
        schema: ResolverSchema;
        timeRange: TimeRange;
        indices: string[];
        ancestors: number;
        descendants: number;
        agentId: string;
      }): Promise<ResolverNode[]> {
        const { treeResponse } = mockTreeWithNoAncestorsAnd2Children({
          originID: metadata.entityIDs.origin,
          firstChildID: metadata.entityIDs.firstChild,
          secondChildID: metadata.entityIDs.secondChild,
        });

        return Promise.resolve(treeResponse);
      },

      /**
       * Get entities matching a document.
       */
      entities({ indices }): Promise<ResolverEntityIndex> {
        // Only return values if the `indices` array contains exactly `'awesome_index'`
        if (indices.length === 1 && indices[0] === 'awesome_index') {
          return Promise.resolve([
            {
              name: 'endpoint',
              schema: {
                id: 'process.entity_id',
                parent: 'process.parent.entity_id',
                ancestry: 'process.Ext.ancestry',
                name: 'process.name',
                agentId: 'agent.id',
              },
              id: metadata.entityIDs.origin,
              agentId: 'mockedAgentId',
            },
          ]);
        }
        return Promise.resolve([]);
      },
    },
  };
}
