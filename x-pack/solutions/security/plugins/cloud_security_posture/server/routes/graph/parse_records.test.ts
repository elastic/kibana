/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApiMessageCode,
  type EntityNodeDataModel,
  type LabelNodeDataModel,
  type GroupNodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { parseRecords } from './parse_records';
import type { EventEdge, RelationshipEdge } from './types';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
} as any;

describe('parseRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty nodes and edges for empty input', () => {
    const result = parseRecords(mockLogger, [], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.messages).toBeUndefined();
  });

  it('creates nodes and edges for a single actor-target-action with entity groups', () => {
    const records: EventEdge[] = [
      {
        action: 'login',
        actorNodeId: 'actor1',
        targetNodeId: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorEntityName: 'John Doe',
        targetEntityName: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"actor1","type":"entity","entity":{"name":"John Doe","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"target1","type":"entity","entity":{"name":"Server 01","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"foo":"bar"}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-1',
      },
    ];
    const result = parseRecords(mockLogger, records, []);

    // Should have 3 nodes: actor (entity ID), target (entity ID), label
    expect(result.nodes.length).toBe(3);

    const actorNode = result.nodes.find((n) => n.id === 'actor1') as EntityNodeDataModel;
    const targetNode = result.nodes.find((n) => n.id === 'target1') as EntityNodeDataModel;
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;

    expect(actorNode).toBeDefined();
    expect(targetNode).toBeDefined();
    expect(labelNode).toBeDefined();

    // Verify actor node uses entity ID (single entity)
    expect(actorNode.id).toBe('actor1');
    expect(actorNode.label).toBe('John Doe');
    expect(actorNode).toHaveProperty('tag', 'user');
    expect(actorNode).toHaveProperty('icon', 'user');
    expect(actorNode).toHaveProperty('shape', 'ellipse');

    // Verify target node uses entity ID (single entity)
    expect(targetNode.id).toBe('target1');
    expect(targetNode.label).toBe('Server 01');
    expect(targetNode).toHaveProperty('tag', 'host');
    expect(targetNode).toHaveProperty('icon', 'storage');
    expect(targetNode).toHaveProperty('shape', 'hexagon');

    // Label node should reference the actor and target by their entity IDs
    expect(labelNode.id).toContain('label(login)ln(doc-id-1)oe(1)oa(0)');
    expect(labelNode.label).toBe('login');
    expect(labelNode).toHaveProperty('documentsData', [{ foo: 'bar' }]);
    expect(labelNode).toHaveProperty('color', 'primary');
    expect(labelNode.shape).toBe('label');
    expect(labelNode).toHaveProperty('uniqueEventsCount', 1);

    // Should have 2 edges: actor->label, label->target
    expect(result.edges.length).toBe(2);
    expect(result.edges[0].source).toBe('actor1');
    expect(result.edges[0].target).toBe(labelNode.id);
    expect(result.edges[1].source).toBe(labelNode.id);
    expect(result.edges[1].target).toBe('target1');
    expect(result.edges[0].target).toBe(labelNode.id);
    expect(result.edges[1].source).toBe(labelNode.id);
    expect(result.edges[1].target).toBe(targetNode.id);
  });

  it('handles docs as a single string', () => {
    const records: EventEdge[] = [
      {
        action: 'foo',
        actorNodeId: 'actor1',
        targetNodeId: 'target1',
        actorEntityType: '',
        targetEntityType: '',
        actorIdsCount: 1,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"actor1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
        ],
        targetsDocData: [
          '{"id":"target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: '{"a":1}',
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-1',
      },
    ];
    const result = parseRecords(mockLogger, records, []);
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('documentsData', [{ a: 1 }]);

    // Verify single entities use MD5 hashes
    const actorNode = result.nodes.find((n) => n.id === 'actor1');
    const targetNode = result.nodes.find((n) => n.id === 'target1');
    expect(actorNode).toBeDefined();
    expect(targetNode).toBeDefined();
  });

  it('creates group node when multiple actions between same actor and target groups', () => {
    const records: EventEdge[] = [
      {
        action: 'login',
        actorNodeId: 'actor1',
        targetNodeId: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorEntityName: 'John Doe',
        targetEntityName: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"actor1","type":"entity","entity":{"name":"John Doe","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"target1","type":"entity","entity":{"name":"Server 01","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"foo":"bar"}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-1',
      },
      {
        action: 'logout',
        actorNodeId: 'actor1',
        targetNodeId: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorEntityName: 'John Doe',
        targetEntityName: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"actor1","type":"entity","entity":{"name":"John Doe","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"target1","type":"entity","entity":{"name":"Server 01","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"baz":2}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-1',
      },
    ];
    const result = parseRecords(mockLogger, records, []);

    // Event 1 creates: test-actor-hash (MD5), test-target-hash (MD5)
    // Event 2 creates: test-actor-hash (reused), test-target-hash (reused)
    // Since both events reference the same actor/target groups, a group node IS created

    // Should have a group node since same actor and target have multiple connections
    const groupNode = result.nodes.find((n) => n.shape === 'group') as GroupNodeDataModel;
    expect(groupNode).toBeDefined();

    // Should have 2 entity nodes (1 actor + 1 target), 2 label nodes, and 1 group node = 5 nodes
    expect(result.nodes.length).toBe(5);

    // Find actor and target nodes by MD5 hash
    const actorNode = result.nodes.find((n) => n.id === 'actor1') as EntityNodeDataModel;
    const targetNode = result.nodes.find((n) => n.id === 'target1') as EntityNodeDataModel;

    expect(actorNode).toBeDefined();
    expect(actorNode.label).toBe('John Doe');
    expect(targetNode).toBeDefined();
    expect(targetNode.label).toBe('Server 01');

    // Since same entities have multiple connections, label nodes should have the group as parent
    const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];
    expect(labelNodes.length).toBe(2);
    expect(labelNodes[0].parentId).toBe(groupNode.id); // Has group node
    expect(labelNodes[1].parentId).toBe(groupNode.id); // Has group node
  });

  describe('color assignment', () => {
    it('sets color to danger for isOriginAlert', () => {
      const records: EventEdge[] = [
        {
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: '',
          targetEntityType: '',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          action: 'alert',
          docs: ['{"foo":"bar"}'],
          badge: 1,
          uniqueEventsCount: 0,
          uniqueAlertsCount: 1,
          isAlert: false,
          isOrigin: true,
          isOriginAlert: true,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);
      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('color', 'danger');
      expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
    });

    it('sets color to danger for isAlert', () => {
      const records: EventEdge[] = [
        {
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: '',
          targetEntityType: '',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          action: 'alert',
          docs: ['{"foo":"bar"}'],
          badge: 1,
          uniqueEventsCount: 0,
          uniqueAlertsCount: 1,
          isAlert: true,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);
      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('color', 'danger');
      expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
    });
  });

  it('sets label node id based on action, isOrigin and isOriginAlert fields', () => {
    const baseLabelNodeData = {
      actorNodeId: 'actor1',
      targetNodeId: 'target1',
      actorEntityType: '',
      targetEntityType: '',
      actorIdsCount: 1,
      targetIdsCount: 1,
      actorsDocData: [
        '{"id":"actor1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
      ],
      targetsDocData: [
        '{"id":"target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
      ],
      docs: ['{"foo":"bar"}'],
      badge: 1,
      uniqueEventsCount: 0,
      uniqueAlertsCount: 1,
      isAlert: true,
      actorHostIps: [],
      targetHostIps: [],
      sourceIps: [],
      sourceCountryCodes: [],
    };

    const records: EventEdge[] = [
      {
        ...baseLabelNodeData,
        action: 'action1',
        isOrigin: false,
        isOriginAlert: false,
        labelNodeId: 'doc-id-1',
      },
      {
        ...baseLabelNodeData,
        action: 'action2',
        isOrigin: true,
        isOriginAlert: false,
        labelNodeId: 'doc-id-2',
      },
      {
        ...baseLabelNodeData,
        action: 'action3',
        isOrigin: false,
        isOriginAlert: true,
        labelNodeId: 'doc-id-3',
      },
      {
        ...baseLabelNodeData,
        action: 'action4',
        isOrigin: true,
        isOriginAlert: true,
        labelNodeId: 'doc-id-4',
      },
    ];
    const result = parseRecords(mockLogger, records, []);
    const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];

    // All events use MD5 hashes for actor and target groups
    // Since it's the same actor and target with multiple actions, they should reuse hashes
    expect(labelNodes.map((n) => n.id)).toStrictEqual([
      `label(action1)ln(doc-id-1)oe(0)oa(0)`,
      `label(action2)ln(doc-id-2)oe(1)oa(0)`,
      `label(action3)ln(doc-id-3)oe(0)oa(1)`,
      `label(action4)ln(doc-id-4)oe(1)oa(1)`,
    ]);
  });

  it('limits nodes and sets message when nodesLimit is reached', () => {
    const records: EventEdge[] = [
      {
        action: 'foo',
        actorNodeId: 'md5hash-a1-a2',
        targetNodeId: 't1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorIdsCount: 2,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"a1","type":"entity","entity":{"name":"Actor 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          '{"id":"a2","type":"entity","entity":{"name":"Actor 2","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"t1","type":"entity","entity":{"name":"Target 1","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"foo":"bar"}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-1',
      },
      {
        action: 'foo2',
        actorNodeId: 'a3',
        targetNodeId: 'md5hash-t2-t3',
        actorEntityType: 'service',
        targetEntityType: 'entity',
        actorIdsCount: 1,
        targetIdsCount: 2,
        actorsDocData: [
          '{"id":"a3","type":"entity","entity":{"name":"Actor 3","type":"service","sub_type":"Services","ecsParentField":"service","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"t2","type":"entity","entity":{"name":"Target 2","type":"entity","sub_type":"Entity","ecsParentField":"entity","availableInEntityStore":true}}',
          '{"id":"t3","type":"entity","entity":{"name":"Target 3","type":"entity","sub_type":"Entity","ecsParentField":"entity","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"foo":"bar"}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-id-2',
      },
    ];
    // nodesLimit = 2, so only first record should be processed
    // First record creates 3 nodes (actor group, target group, label)
    const result = parseRecords(mockLogger, records, [], 2);
    expect(result.nodes.length).toBeLessThanOrEqual(3);
    expect(result.messages).toContain(ApiMessageCode.ReachedNodesLimit);
  });

  it('enforces a shared node limit across event and relationship records', () => {
    // Event record: creates actor (actor-1), target (target-1), and label node = 3 nodes
    const eventRecords: EventEdge[] = [
      {
        action: 'Login',
        actorNodeId: 'actor-1',
        targetNodeId: 'target-1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorIdsCount: 1,
        targetIdsCount: 1,
        actorsDocData: [
          '{"id":"actor-1","type":"entity","entity":{"name":"Actor 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetsDocData: [
          '{"id":"target-1","type":"entity","entity":{"name":"Target 1","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
        uniqueEventsCount: 1,
        uniqueAlertsCount: 0,
        docs: ['{"foo":"bar"}'],
        isAlert: false,
        isOrigin: true,
        isOriginAlert: false,
        actorHostIps: [],
        targetHostIps: [],
        sourceIps: [],
        sourceCountryCodes: [],
        labelNodeId: 'doc-shared-limit',
      },
    ];

    // Relationship records: each would create actor, target, and relationship connector nodes
    const relationshipRecords: RelationshipEdge[] = [
      {
        relationship: 'Owns',
        relationshipNodeId: 'rel-actor-1-Owns',
        actorNodeId: 'rel-actor-1',
        actorIds: ['rel-actor-1'],
        actorIdsCount: 1,
        actorEntityType: 'user',
        actorEntitySubType: 'Identity Users',
        actorEntityName: 'Rel Actor 1',
        actorsDocData: [
          '{"id":"rel-actor-1","type":"entity","entity":{"name":"Rel Actor 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
        ],
        targetNodeId: 'rel-target-1',
        targetIds: ['rel-target-1'],
        targetIdsCount: 1,
        targetEntityType: 'host',
        targetEntitySubType: 'Server',
        targetEntityName: 'Rel Target 1',
        targetsDocData: [
          '{"id":"rel-target-1","type":"entity","entity":{"name":"Rel Target 1","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
      },
      {
        relationship: 'Communicates_with',
        relationshipNodeId: 'rel-actor-2-Communicates_with',
        actorNodeId: 'rel-actor-2',
        actorIds: ['rel-actor-2'],
        actorIdsCount: 1,
        actorEntityType: 'service',
        actorEntitySubType: 'Services',
        actorEntityName: 'Rel Actor 2',
        actorsDocData: [
          '{"id":"rel-actor-2","type":"entity","entity":{"name":"Rel Actor 2","type":"service","sub_type":"Services","ecsParentField":"service","availableInEntityStore":true}}',
        ],
        targetNodeId: 'rel-target-2',
        targetIds: ['rel-target-2'],
        targetIdsCount: 1,
        targetEntityType: 'host',
        targetEntitySubType: 'Server',
        targetEntityName: 'Rel Target 2',
        targetsDocData: [
          '{"id":"rel-target-2","type":"entity","entity":{"name":"Rel Target 2","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
        ],
        badge: 1,
      },
    ];

    // Set nodesLimit to 5:
    // - Event record creates 3 nodes (actor-1, target-1, label)
    // - First relationship record would add 3 more nodes (rel-actor-1, rel-target-1, rel(Owns))
    //   reaching 6 nodes total, but the limit check before the 2nd relationship stops further processing
    // - Second relationship record should NOT be processed
    const result = parseRecords(mockLogger, eventRecords, relationshipRecords, 5);

    // Verify that the second relationship record was skipped due to the shared limit
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain('actor-1'); // from event
    expect(nodeIds).toContain('target-1'); // from event
    expect(nodeIds).toContain('rel-actor-1'); // from 1st relationship
    expect(nodeIds).toContain('rel-target-1'); // from 1st relationship

    // Second relationship's nodes should NOT be present
    expect(nodeIds).not.toContain('rel-actor-2');
    expect(nodeIds).not.toContain('rel-target-2');

    expect(result.messages).toContain(ApiMessageCode.ReachedNodesLimit);
  });

  // Test for entity grouping by type and sub_type
  describe('enriched entities grouping', () => {
    it('groups actors and targets by type and sub_type', () => {
      const records: EventEdge[] = [
        {
          action: 'connect',
          actorNodeId: 'md5hash-user1-user2',
          targetNodeId: 'server1',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorEntitySubType: 'Identity Users',
          targetEntityName: 'Server Hosts',
          actorIdsCount: 2,
          targetIdsCount: 1,
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"connection"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorsDocData: [
            '{"id":"user1","type":"entity","entity":{"name":"John Doe","type":"user","sub_type":"identity"}}',
            '{"id":"user2","type":"entity","entity":{"name":"Jane Doe","type":"user","sub_type":"identity"}}',
          ],
          targetsDocData: [
            '{"id":"server1","type":"entity","entity":{"name":"web-server-01","type":"host","sub_type":"server"}}',
          ],
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      // Should have actor group with both type and sub_type entities
      const actorNode = result.nodes.find(
        (n) => n.label === 'Identity Users'
      ) as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Identity Users');
      expect(actorNode).toHaveProperty('tag', 'user');
      expect(actorNode).toHaveProperty('count', 2);
      expect(actorNode).toHaveProperty('documentsData');
      expect(actorNode.documentsData).toHaveLength(2);
      expect(actorNode.documentsData![0].entity).toHaveProperty('type', 'user');
      expect(actorNode.documentsData![0].entity).toHaveProperty('sub_type', 'identity');
      expect(actorNode.documentsData![0].entity).toHaveProperty('type', 'user');
      expect(actorNode.documentsData![1].entity).toHaveProperty('sub_type', 'identity');

      // Should have target group with both type and sub_type entities
      const targetNode = result.nodes.find(
        (n) => n.label === 'Server Hosts'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode!.label).toBe('Server Hosts');
      expect(targetNode).toHaveProperty('tag', 'host');
      expect(targetNode).not.toHaveProperty('count');
      expect(targetNode).toHaveProperty('documentsData');
      expect(targetNode.documentsData).toHaveLength(1);
      expect(targetNode.documentsData![0].entity).toHaveProperty('type', 'host');
      expect(targetNode.documentsData![0].entity).toHaveProperty('sub_type', 'server');
    });

    it('groups actors and targets by type only when sub_type is missing', () => {
      const records: EventEdge[] = [
        {
          action: 'access',
          actorNodeId: 'md5hash-service1-service2',
          targetNodeId: 'file1',
          actorEntityType: 'service',
          targetEntityType: 'file',
          actorEntitySubType: 'Services',
          targetEntityName: 'Files',
          actorIdsCount: 2,
          targetIdsCount: 1,
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"file_access"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorsDocData: [
            '{"id":"service1","type":"entity","entity":{"name":"web-service","type":"service"}}',
            '{"id":"service2","type":"entity","entity":{"name":"api-service","type":"service"}}',
          ],
          targetsDocData: [
            '{"id":"file1","type":"entity","entity":{"name":"config.json","type":"file"}}',
          ],
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const actorNode = result.nodes.find((n) => n.label === 'Services') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Services');
      expect(actorNode).toHaveProperty('tag', 'service');
      expect(actorNode).toHaveProperty('count', 2);
      expect(actorNode.documentsData).toHaveLength(2);
      expect(actorNode.documentsData![0].entity).toHaveProperty('type', 'service');
      expect(actorNode.documentsData![0].entity).not.toHaveProperty('sub_type');
      expect(actorNode.documentsData![1].entity).toHaveProperty('type', 'service');
      expect(actorNode.documentsData![1].entity).not.toHaveProperty('sub_type');

      const targetNode = result.nodes.find((n) => n.label === 'Files') as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode!.label).toBe('Files');
      expect(targetNode).toHaveProperty('tag', 'file');
      expect(targetNode.documentsData).toHaveLength(1);
      expect(targetNode.documentsData![0].entity).toHaveProperty('type', 'file');
      expect(targetNode.documentsData![0].entity).not.toHaveProperty('sub_type');
    });
  });

  // Test for unknown target processing
  describe('unknown target processing', () => {
    // Mock uuid module for unknown target tests
    jest.mock('uuid', () => ({
      v4: jest.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { v4: uuidv4 } = require('uuid');
    const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

    beforeEach(() => {
      // Set up a sequence of predictable UUIDs
      let counter = 0;
      mockUuidv4.mockImplementation((() => {
        counter += 1;
        return `uuid-${counter}`;
      }) as any);
    });

    it('properly processes unknown targets with processUnknownTargetGroup', () => {
      const records: EventEdge[] = [
        {
          action: 'suspicious_activity',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: '',
          actorEntityName: 'Threat Actor',
          actorIdsCount: 1,
          targetIdsCount: 0,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Threat Actor","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"alert":"suspicious_behavior"}'],
          isAlert: false,
          isOrigin: false,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      // Should create unknown target node
      const unknownNode = result.nodes.find((n) => n.label === 'Unknown') as EntityNodeDataModel;
      expect(unknownNode).toBeDefined();
      expect(unknownNode!.id.startsWith('unknown')).toBe(true);
      expect(unknownNode).toHaveProperty('documentsData', []);
      expect(unknownNode).toHaveProperty('shape', 'rectangle');

      // Should have actor node
      const actorNode = result.nodes.find((n) => n.label === 'Threat Actor') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Threat Actor');
      expect(actorNode).toHaveProperty('tag', 'user');

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('color', 'primary');

      // Should have proper edges
      expect(result.edges).toHaveLength(2);
      const actorToLabelEdge = result.edges.find((e) => e.source === actorNode.id);
      expect(actorToLabelEdge).toBeDefined();
      const labelToUnknownEdge = result.edges.find((e) => e.target === unknownNode!.id);
      expect(labelToUnknownEdge).toBeDefined();
    });
  });

  describe('event and alert grouping', () => {
    it('creates label node with one event', () => {
      const records: EventEdge[] = [
        {
          action: 'file_access',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: '',
          targetEntityType: '',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event_type":"file_access","timestamp":"2024-01-01T10:00:00Z"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('uniqueEventsCount', 1);
      expect(labelNode).not.toHaveProperty('uniqueAlertsCount');
      expect(labelNode).toHaveProperty('documentsData');
      expect(labelNode.documentsData).toHaveLength(1);
      expect(labelNode.documentsData![0]).toHaveProperty('event_type', 'file_access');
      expect(labelNode).toHaveProperty('color', 'primary');
    });

    it('creates label node with one alert', () => {
      const records: EventEdge[] = [
        {
          action: 'malware_detected',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'malware',
          targetEntityType: 'system',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor 1","type":"malware","sub_type":"Malware","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target 1","type":"system","sub_type":"System","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          badge: 1,
          uniqueEventsCount: 0,
          uniqueAlertsCount: 1,
          docs: ['{"alert_type":"malware","severity":"high"}'],
          isAlert: true,
          isOrigin: true,
          isOriginAlert: true,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).not.toHaveProperty('uniqueEventsCount');
      expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
      expect(labelNode).toHaveProperty('documentsData');
      expect(labelNode.documentsData).toHaveLength(1);
      expect(labelNode.documentsData![0]).toHaveProperty('alert_type', 'malware');
      expect(labelNode).toHaveProperty('color', 'danger');
    });

    it('creates label node with multiple events', () => {
      const records: EventEdge[] = [
        {
          action: 'network_activity',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'server',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target 1","type":"server","sub_type":"Server","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          badge: 3,
          uniqueEventsCount: 3,
          uniqueAlertsCount: 0,
          docs: [
            '{"event_type":"connection","timestamp":"2024-01-01T10:00:00Z"}',
            '{"event_type":"data_transfer","timestamp":"2024-01-01T10:05:00Z"}',
            '{"event_type":"disconnection","timestamp":"2024-01-01T10:10:00Z"}',
          ],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('uniqueEventsCount', 3);
      expect(labelNode).not.toHaveProperty('uniqueAlertsCount');
      expect(labelNode).toHaveProperty('documentsData');
      expect(labelNode.documentsData).toHaveLength(3);
      expect(labelNode).toHaveProperty('color', 'primary');
      expect(labelNode).toHaveProperty('count', 3);
    });

    it('creates label node with mixed events and alerts', () => {
      const records: EventEdge[] = [
        {
          action: 'suspicious_login',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target 1","type":"system","sub_type":"System","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          badge: 5,
          uniqueEventsCount: 3,
          uniqueAlertsCount: 2,
          docs: [
            '{"event_type":"login_attempt","timestamp":"2024-01-01T10:00:00Z"}',
            '{"alert_type":"brute_force","severity":"medium"}',
            '{"alert_type":"anomalous_behavior","severity":"high"}',
            '{"event_type":"successful_login","timestamp":"2024-01-01T10:05:00Z"}',
            '{"event_type":"logout","timestamp":"2024-01-01T10:30:00Z"}',
          ],
          isAlert: true,
          isOrigin: true,
          isOriginAlert: true,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('color', 'primary'); // Color is primary when uniqueEventsCount > 0 even with alerts
      expect(labelNode).toHaveProperty('count', 5);
      expect(labelNode).toHaveProperty('uniqueEventsCount', 3);
      expect(labelNode).toHaveProperty('uniqueAlertsCount', 2);
      expect(labelNode).toHaveProperty('documentsData');
      expect(labelNode.documentsData).toHaveLength(5);
    });
  });

  // Test for geographic data (multiple IPs and country codes)
  describe('geographic data handling', () => {
    it('properly handles nodes with multiple IPs and country codes', () => {
      const records: EventEdge[] = [
        {
          action: 'global_access',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorEntityName: 'Global Users',
          targetEntityName: 'Distributed Systems',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Global Users","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Distributed Systems","type":"system","sub_type":"System","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"activity":"cross_border_access"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: ['192.168.1.100', '10.0.0.50'],
          targetHostIps: ['172.16.0.10'],
          sourceIps: ['203.0.113.1', '198.51.100.1'],
          sourceCountryCodes: ['JP', 'CA'],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      // Check actor node has host IPs
      const actorNode = result.nodes.find((n) => n.label === 'Global Users') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode).toHaveProperty('ips', ['192.168.1.100', '10.0.0.50']);

      // Check target node has host IPs
      const targetNode = result.nodes.find(
        (n) => n.label === 'Distributed Systems'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode).toHaveProperty('ips', ['172.16.0.10']);

      // Check label node has source IPs and country codes
      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('ips', ['203.0.113.1', '198.51.100.1']);
      expect(labelNode).toHaveProperty('countryCodes', ['JP', 'CA']);
    });

    it('handles empty geographic data arrays', () => {
      const records: EventEdge[] = [
        {
          action: 'local_access',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorEntityName: 'Local Users',
          targetEntityName: 'Local Systems',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Local Users","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Local Systems","type":"system","sub_type":"System","ecsParentField":"entity","availableInEntityStore":true}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"activity":"local_access"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      // Nodes should not have IP or country code properties when arrays are empty
      const actorNode = result.nodes.find((n) => n.label === 'Local Users') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode).not.toHaveProperty('ips');

      const targetNode = result.nodes.find(
        (n) => n.label === 'Local Systems'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode).not.toHaveProperty('ips');

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).not.toHaveProperty('ips');
      expect(labelNode).not.toHaveProperty('countryCodes');
    });
  });

  describe('additional edge cases', () => {
    it('handles minimal documentsData when no entity enrichment exists', () => {
      const records: EventEdge[] = [
        {
          action: 'login',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: '',
          targetEntityType: '',
          actorEntityName: '',
          targetEntityName: '',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"service","availableInEntityStore":false}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"foo":"bar"}'],
          isOrigin: true,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const userNode = result.nodes.find((n) => n.label === 'actor1') as EntityNodeDataModel;
      expect(userNode).toBeDefined();
      expect(userNode.documentsData).toEqual([
        {
          id: 'actor1',
          type: 'entity',
          entity: { ecsParentField: 'user', availableInEntityStore: false },
        },
      ]);

      const serviceNode = result.nodes.find((n) => n.label === 'target1') as EntityNodeDataModel;
      expect(serviceNode).toBeDefined();
      expect(serviceNode.documentsData).toEqual([
        {
          id: 'target1',
          type: 'entity',
          entity: { ecsParentField: 'service', availableInEntityStore: false },
        },
      ]);
    });
  });

  describe('entities enrichment', () => {
    it('should create single non-enriched entity node with tag "Entity", label as entity.id, and no count', () => {
      const records: EventEdge[] = [
        {
          action: 'test.action',
          actorNodeId: 'non-enriched-actor-123',
          targetNodeId: 'non-enriched-target-456',
          actorEntityType: '',
          targetEntityType: '',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"non-enriched-actor-123","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"non-enriched-target-456","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"id":"event1","type":"event"}'],
          isOrigin: false,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];

      const result = parseRecords(mockLogger, records, []);

      // Find actor and target nodes by group ID (which is entity ID for single entities)
      const actorNode = result.nodes.find(
        (n) => n.id === 'non-enriched-actor-123'
      ) as EntityNodeDataModel;
      const targetNode = result.nodes.find(
        (n) => n.id === 'non-enriched-target-456'
      ) as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBe('non-enriched-actor-123'); // group ID (entity ID for single)
      expect(actorNode.tag).toBe('Entity');
      expect(actorNode.icon).toBe('magnifyWithExclamation');
      expect(actorNode.shape).toBe('rectangle');
      expect(actorNode.count).toBeUndefined();

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBe('non-enriched-target-456'); // group ID (entity ID for single)
      expect(targetNode.tag).toBe('Entity');
      expect(targetNode.icon).toBe('magnifyWithExclamation');
      expect(targetNode.shape).toBe('rectangle');
      expect(targetNode.count).toBeUndefined();
    });

    it('should create group non-enriched entity node with tag "Entities", label undefined, and count', () => {
      const records: EventEdge[] = [
        {
          action: 'test.action.multiple',
          actorNodeId: 'md5hash-entity1-entity2-entity3',
          targetNodeId: 'md5hash-target1-target2',
          actorEntityType: '',
          targetEntityType: '',
          actorIdsCount: 3,
          targetIdsCount: 2,
          actorsDocData: [
            '{"id":"entity1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
            '{"id":"entity2","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
            '{"id":"entity3","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":" target1","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
            '{"id":"target2","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          badge: 5,
          uniqueEventsCount: 5,
          uniqueAlertsCount: 0,
          docs: [
            '{"id":"event1","type":"event"}',
            '{"id":"event2","type":"event"}',
            '{"id":"event3","type":"event"}',
            '{"id":"event4","type":"event"}',
            '{"id":"event5","type":"event"}',
          ],
          isOrigin: false,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];

      const result = parseRecords(mockLogger, records, []);

      const actorNode = result.nodes.find(
        (n) => n.id === 'md5hash-entity1-entity2-entity3'
      ) as EntityNodeDataModel;
      const targetNode = result.nodes.find(
        (n) => n.id === 'md5hash-target1-target2'
      ) as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBeUndefined(); // UI will fallback to node ID
      expect(actorNode.tag).toBe('Entities');
      expect(actorNode.icon).toBe('magnifyWithExclamation');
      expect(actorNode.shape).toBe('rectangle');
      expect(actorNode.count).toBe(3);

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBeUndefined(); // UI will fallback to node ID
      expect(targetNode.tag).toBe('Entities');
      expect(targetNode.icon).toBe('magnifyWithExclamation');
      expect(targetNode.shape).toBe('rectangle');
      expect(targetNode.count).toBe(2);
    });

    it('should create single enriched entity node with tag as entity.type, label as entity.name, and no count', () => {
      const records: EventEdge[] = [
        {
          action: 'test.action',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorEntityName: 'John Doe',
          targetEntityName: 'web-server-01',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"John Doe","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"web-server-01","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"id":"event1","type":"event"}'],
          isOrigin: false,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];

      const result = parseRecords(mockLogger, records, []);

      // Find actor and target nodes by MD5 hash (nodes always use actorNodeId/targetNodeId)
      const actorNode = result.nodes.find((n) => n.id === 'actor1') as EntityNodeDataModel;
      const targetNode = result.nodes.find((n) => n.id === 'target1') as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBe('John Doe'); // entity.name
      expect(actorNode.tag).toBe('user');
      expect(actorNode.icon).toBe('user');
      expect(actorNode.shape).toBe('ellipse');
      expect(actorNode.count).toBeUndefined();

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBe('web-server-01'); // entity.name
      expect(targetNode.tag).toBe('host');
      expect(targetNode.icon).toBe('storage');
      expect(targetNode.shape).toBe('hexagon');
      expect(targetNode.count).toBeUndefined();
    });

    it('should create group enriched entity node with tag as entity.type, label as entity.sub_type, and count', () => {
      const records: EventEdge[] = [
        {
          action: 'test.action',
          actorNodeId: 'md5hash-user1-user2-user3',
          targetNodeId: 'md5hash-host1-host2',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorEntitySubType: 'service_account',
          targetEntitySubType: 'server',
          actorIdsCount: 3,
          targetIdsCount: 2,
          actorsDocData: [
            '{"id":"user1","type":"entity","entity":{"name":"User 1","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
            '{"id":"user2","type":"entity","entity":{"name":"User 2","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
            '{"id":"user3","type":"entity","entity":{"name":"User 3","type":"user","sub_type":"Identity Users","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"host1","type":"entity","entity":{"name":"Host 1","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
            '{"id":"host2","type":"entity","entity":{"name":"Host 2","type":"host","sub_type":"Server","ecsParentField":"host","availableInEntityStore":true}}',
          ],
          badge: 5,
          uniqueEventsCount: 5,
          uniqueAlertsCount: 0,
          docs: [
            '{"id":"event1","type":"event"}',
            '{"id":"event2","type":"event"}',
            '{"id":"event3","type":"event"}',
            '{"id":"event4","type":"event"}',
            '{"id":"event5","type":"event"}',
          ],
          isOrigin: false,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];

      const result = parseRecords(mockLogger, records, []);

      const actorNode = result.nodes.find(
        (n) => n.id === 'md5hash-user1-user2-user3'
      ) as EntityNodeDataModel;
      const targetNode = result.nodes.find(
        (n) => n.id === 'md5hash-host1-host2'
      ) as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBe('service_account');
      expect(actorNode.tag).toBe('user');
      expect(actorNode.icon).toBe('user');
      expect(actorNode.shape).toBe('ellipse');
      expect(actorNode.count).toBe(3);

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBe('server');
      expect(targetNode.tag).toBe('host');
      expect(targetNode.icon).toBe('storage');
      expect(targetNode.shape).toBe('hexagon');
      expect(targetNode.count).toBe(2);
    });

    it('should create group enriched entity node with type only (no sub_type), label undefined, and count', () => {
      const records: EventEdge[] = [
        {
          action: 'test.action',
          actorNodeId: 'md5hash-user1-user2-user3',
          targetNodeId: 'md5hash-host1-host2',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorIdsCount: 3,
          targetIdsCount: 2,
          actorsDocData: [
            '{"id":"user1","type":"entity","entity":{"name":"User 1","type":"user","sub_type":"","ecsParentField":"user","availableInEntityStore":true}}',
            '{"id":"user2","type":"entity","entity":{"name":"User 2","type":"user","sub_type":"","ecsParentField":"user","availableInEntityStore":true}}',
            '{"id":"user3","type":"entity","entity":{"name":"User 3","type":"user","sub_type":"","ecsParentField":"user","availableInEntityStore":true}}',
          ],
          targetsDocData: [
            '{"id":"host1","type":"entity","entity":{"name":"Host 1","type":"host","sub_type":"","ecsParentField":"host","availableInEntityStore":true}}',
            '{"id":"host2","type":"entity","entity":{"name":"Host 2","type":"host","sub_type":"","ecsParentField":"host","availableInEntityStore":true}}',
          ],
          badge: 5,
          uniqueEventsCount: 5,
          uniqueAlertsCount: 0,
          docs: [
            '{"id":"event1","type":"event"}',
            '{"id":"event2","type":"event"}',
            '{"id":"event3","type":"event"}',
            '{"id":"event4","type":"event"}',
            '{"id":"event5","type":"event"}',
          ],
          isOrigin: false,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];

      const result = parseRecords(mockLogger, records, []);

      const actorNode = result.nodes.find(
        (n) => n.id === 'md5hash-user1-user2-user3'
      ) as EntityNodeDataModel;
      const targetNode = result.nodes.find(
        (n) => n.id === 'md5hash-host1-host2'
      ) as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBeUndefined(); // No label when only type exists
      expect(actorNode.tag).toBe('user');
      expect(actorNode.icon).toBe('user');
      expect(actorNode.shape).toBe('ellipse');
      expect(actorNode.count).toBe(3);

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBeUndefined(); // No label when only type exists
      expect(targetNode.tag).toBe('host');
      expect(targetNode.icon).toBe('storage');
      expect(targetNode.shape).toBe('hexagon');
      expect(targetNode.count).toBe(2);
    });
  });

  describe('ecsParentField handling', () => {
    it('returns actor and target documentsData with ecsParentField when there is no matching entity enrichment - single actor and target', () => {
      const records: EventEdge[] = [
        {
          action: 'login',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'service',
          actorEntityName: 'User',
          targetEntityName: 'Service',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"service","availableInEntityStore":false}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"foo":"bar"}'],
          isOrigin: true,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);
      const actorNode = result.nodes.find((n) => n.id === 'actor1') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode.documentsData).toHaveLength(1);
      expect(actorNode.documentsData![0]).toEqual({
        id: 'actor1',
        type: 'entity',
        entity: { ecsParentField: 'user', availableInEntityStore: false },
      });
      const targetNode = result.nodes.find((n) => n.id === 'target1') as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode.documentsData).toHaveLength(1);
      expect(targetNode.documentsData![0]).toEqual({
        id: 'target1',
        type: 'entity',
        entity: { ecsParentField: 'service', availableInEntityStore: false },
      });
    });

    it('returns target documentData with ecsParentField when the target has matching entity enrichment - multiple targets', () => {
      const records: EventEdge[] = [
        {
          action: 'login',
          actorNodeId: 'user1',
          targetNodeId: '63861393ae85888aeb59aab1672b3957',
          actorEntityType: 'user',
          targetEntityType: 'service',
          targetEntitySubType: 'Service Instance',
          actorEntityName: null,
          targetEntityName: ['service1', 'service2', 'service3'],
          actorIdsCount: 1,
          targetIdsCount: 3,
          actorsDocData: [
            '{"id":"user1","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"service1","type":"entity","entity":{"name":"Service 1","type":"service","sub_type":"Service Instance","ecsParentField":"service","availableInEntityStore":true}}',
            '{"id":"service2","type":"entity","entity":{"name":"Service 2","type":"service","sub_type":"Service Instance","ecsParentField":"service","availableInEntityStore":true}}',
            '{"id":"service3","type":"entity","entity":{"name":"Service 3","type":"service","sub_type":"Service Instance","ecsParentField":"service","availableInEntityStore":true}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"foo":"bar"}'],
          isOrigin: true,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const targetNode = result.nodes.find(
        (n) => n.id === '63861393ae85888aeb59aab1672b3957'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode.documentsData).toHaveLength(3);
      expect(targetNode.documentsData![0]).toEqual({
        id: 'service1',
        type: 'entity',
        entity: {
          name: 'Service 1',
          type: 'service',
          sub_type: 'Service Instance',
          ecsParentField: 'service',
          availableInEntityStore: true,
        },
      });
      expect(targetNode.documentsData![1]).toEqual({
        id: 'service2',
        type: 'entity',
        entity: {
          name: 'Service 2',
          type: 'service',
          sub_type: 'Service Instance',
          ecsParentField: 'service',
          availableInEntityStore: true,
        },
      });
      expect(targetNode.documentsData![2]).toEqual({
        id: 'service3',
        type: 'entity',
        entity: {
          name: 'Service 3',
          type: 'service',
          sub_type: 'Service Instance',
          ecsParentField: 'service',
          availableInEntityStore: true,
        },
      });
      expect(targetNode.label).toBe('Service Instance');
    });

    it('returns multiple actors and targets documentsData with ecsParentField when there is no entity enrichment', () => {
      const records: EventEdge[] = [
        {
          action: 'access',
          actorNodeId: 'md5hash-actor1-actor2-actor3',
          targetNodeId: 'md5hash-target1-target2',
          actorEntityType: '',
          targetEntityType: '',
          actorEntityName: null,
          targetEntityName: null,
          actorIdsCount: 3,
          targetIdsCount: 2,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
            '{"id":"actor2","type":"entity","entity":{"ecsParentField":"user","availableInEntityStore":false}}',
            '{"id":"actor3","type":"entity","entity":{"ecsParentField":"host","availableInEntityStore":false}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"ecsParentField":"service","availableInEntityStore":false}}',
            '{"id":"target2","type":"entity","entity":{"ecsParentField":"entity","availableInEntityStore":false}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"foo":"bar"}'],
          isOrigin: true,
          isOriginAlert: false,
          isAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
      ];
      const result = parseRecords(mockLogger, records, []);

      const actorNode = result.nodes.find(
        (n) => n.id === 'md5hash-actor1-actor2-actor3'
      ) as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode.documentsData).toHaveLength(3);
      expect(actorNode.documentsData![0]).toEqual({
        id: 'actor1',
        type: 'entity',
        entity: { ecsParentField: 'user', availableInEntityStore: false },
      });
      expect(actorNode.documentsData![1]).toEqual({
        id: 'actor2',
        type: 'entity',
        entity: { ecsParentField: 'user', availableInEntityStore: false },
      });
      expect(actorNode.documentsData![2]).toEqual({
        id: 'actor3',
        type: 'entity',
        entity: { ecsParentField: 'host', availableInEntityStore: false },
      });
      expect(actorNode.label).toBeUndefined();
      expect(actorNode.tag).toBe('Entities');
      expect(actorNode.icon).toBe('magnifyWithExclamation');
      expect(actorNode.shape).toBe('rectangle');
      expect(actorNode.count).toBe(3);

      const targetNode = result.nodes.find(
        (n) => n.id === 'md5hash-target1-target2'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode.documentsData).toHaveLength(2);
      expect(targetNode.documentsData![0]).toEqual({
        id: 'target1',
        type: 'entity',
        entity: { ecsParentField: 'service', availableInEntityStore: false },
      });
      expect(targetNode.documentsData![1]).toEqual({
        id: 'target2',
        type: 'entity',
        entity: { ecsParentField: 'entity', availableInEntityStore: false },
      });
      expect(targetNode.label).toBeUndefined();
      expect(targetNode.tag).toBe('Entities');
      expect(targetNode.icon).toBe('magnifyWithExclamation');
      expect(targetNode.shape).toBe('rectangle');
      expect(targetNode.count).toBe(2);
    });
  });

  describe('label stacking by actor-target pairs', () => {
    it('stacks labels with same actor-target pair under a group node even with different labelNodeIds', () => {
      // Two different documents (different labelNodeIds) with the same actor-target pair
      // should be stacked together under a group node
      const records: EventEdge[] = [
        {
          action: 'action1',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor","ecsParentField":"user"}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target","ecsParentField":"host"}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"foo"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1', // Different document
        },
        {
          action: 'action2',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor","ecsParentField":"user"}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target","ecsParentField":"host"}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"bar"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-2', // Different document
        },
      ];
      const result = parseRecords(mockLogger, records);

      // Should have: 1 actor, 1 target, 2 labels, 1 group node = 5 nodes
      expect(result.nodes.length).toBe(5);

      // Should have a group node
      const groupNode = result.nodes.find((n) => n.shape === 'group') as GroupNodeDataModel;
      expect(groupNode).toBeDefined();

      // Both label nodes should have the group as parent
      const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];
      expect(labelNodes.length).toBe(2);
      expect(labelNodes[0].parentId).toBe(groupNode.id);
      expect(labelNodes[1].parentId).toBe(groupNode.id);
    });

    it('does not stack labels with different actor-target pairs', () => {
      // Two different actor-target pairs should NOT be stacked together
      const records: EventEdge[] = [
        {
          action: 'action1',
          actorNodeId: 'actor1',
          targetNodeId: 'target1',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor1","type":"entity","entity":{"name":"Actor1","ecsParentField":"user"}}',
          ],
          targetsDocData: [
            '{"id":"target1","type":"entity","entity":{"name":"Target1","ecsParentField":"host"}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"foo"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-1',
        },
        {
          action: 'action2',
          actorNodeId: 'actor2',
          targetNodeId: 'target2',
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [
            '{"id":"actor2","type":"entity","entity":{"name":"Actor2","ecsParentField":"user"}}',
          ],
          targetsDocData: [
            '{"id":"target2","type":"entity","entity":{"name":"Target2","ecsParentField":"host"}}',
          ],
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"bar"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
          labelNodeId: 'doc-id-2',
        },
      ];
      const result = parseRecords(mockLogger, records);

      // Should have: 2 actors, 2 targets, 2 labels = 6 nodes (NO group node)
      expect(result.nodes.length).toBe(6);

      // Should NOT have a group node
      const groupNode = result.nodes.find((n) => n.shape === 'group');
      expect(groupNode).toBeUndefined();

      // Label nodes should NOT have parentId
      const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];
      expect(labelNodes.length).toBe(2);
      expect(labelNodes[0].parentId).toBeUndefined();
      expect(labelNodes[1].parentId).toBeUndefined();
    });
  });
});
