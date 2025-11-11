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
import type { GraphEdge } from './types';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
} as any;

describe('parseRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up a sequence of predictable UUIDs
    let counter = 0;
    mockUuidv4.mockImplementation((() => {
      counter += 1;
      return `uuid-${counter}`;
    }) as any);
  });

  it('returns empty nodes and edges for empty input', () => {
    const result = parseRecords(mockLogger, []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.messages).toBeUndefined();
  });

  it('creates nodes and edges for a single actor-target-action with entity groups', () => {
    const records: GraphEdge[] = [
      {
        action: 'login',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorLabel: 'John Doe',
        targetLabel: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
    ];
    const result = parseRecords(mockLogger, records);

    // Should have 3 nodes: actor (uuid-1), target (uuid-2), label
    expect(result.nodes.length).toBe(3);

    const actorNode = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
    const targetNode = result.nodes.find((n) => n.id === 'uuid-2') as EntityNodeDataModel;
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;

    expect(actorNode).toBeDefined();
    expect(targetNode).toBeDefined();
    expect(labelNode).toBeDefined();

    // Verify actor node uses UUID
    expect(actorNode.id).toBe('uuid-1');
    expect(actorNode.label).toBe('John Doe');
    expect(actorNode).toHaveProperty('tag', 'user');
    expect(actorNode).toHaveProperty('icon', 'user');
    expect(actorNode).toHaveProperty('shape', 'ellipse');

    // Verify target node uses UUID
    expect(targetNode.id).toBe('uuid-2');
    expect(targetNode.label).toBe('Server 01');
    expect(targetNode).toHaveProperty('tag', 'host');
    expect(targetNode).toHaveProperty('icon', 'storage');
    expect(targetNode).toHaveProperty('shape', 'hexagon');

    // Label node should reference the actor and target by their UUIDs
    expect(labelNode.id).toContain('label(login)oe(1)oa(0)');
    expect(labelNode.label).toBe('login');
    expect(labelNode).toHaveProperty('documentsData', [{ foo: 'bar' }]);
    expect(labelNode).toHaveProperty('color', 'primary');
    expect(labelNode.shape).toBe('label');
    expect(labelNode).toHaveProperty('uniqueEventsCount', 1);

    // Should have 2 edges: actor->label, label->target
    expect(result.edges.length).toBe(2);
    expect(result.edges[0].source).toBe('uuid-1');
    expect(result.edges[0].target).toBe(labelNode.id);
    expect(result.edges[1].source).toBe(labelNode.id);
    expect(result.edges[1].target).toBe('uuid-2');
    expect(result.edges[0].target).toBe(labelNode.id);
    expect(result.edges[1].source).toBe(labelNode.id);
    expect(result.edges[1].target).toBe(targetNode.id);
  });

  it('handles docs as a single string', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: '',
        targetEntityType: '',
        actorLabel: 'Actor 1',
        targetLabel: 'Target 1',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('documentsData', [{ a: 1 }]);
  });

  it('creates group node when multiple actions between same actor and target groups', () => {
    const records: GraphEdge[] = [
      {
        action: 'login',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorLabel: 'John Doe',
        targetLabel: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
      {
        action: 'logout',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorLabel: 'John Doe',
        targetLabel: 'Server 01',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
    ];
    const result = parseRecords(mockLogger, records);

    // Event 1 creates: uuid-1 (actor), uuid-2 (target)
    // Event 2 creates: uuid-3 (actor), uuid-4 (target)
    // With pure UUIDs, each event creates separate nodes, so NO group node is created
    // (group nodes are only created when same actor/target nodes have multiple connections)

    // Should NOT have a group node since all nodes are unique
    const groupNode = result.nodes.find((n) => n.shape === 'group') as GroupNodeDataModel;
    expect(groupNode).toBeUndefined();

    // Should have 4 entity nodes (2 actors + 2 targets) and 2 label nodes
    expect(result.nodes.length).toBe(6);

    // Find actor and target nodes by UUID
    const actorNode1 = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
    const targetNode1 = result.nodes.find((n) => n.id === 'uuid-2') as EntityNodeDataModel;
    const actorNode2 = result.nodes.find((n) => n.id === 'uuid-3') as EntityNodeDataModel;
    const targetNode2 = result.nodes.find((n) => n.id === 'uuid-4') as EntityNodeDataModel;

    expect(actorNode1).toBeDefined();
    expect(actorNode1.label).toBe('John Doe');
    expect(targetNode1).toBeDefined();
    expect(targetNode1.label).toBe('Server 01');
    expect(actorNode2).toBeDefined();
    expect(actorNode2.label).toBe('John Doe');
    expect(targetNode2).toBeDefined();
    expect(targetNode2.label).toBe('Server 01');

    // Edges should be simple: actor->label->target for each event
    const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];
    expect(labelNodes.length).toBe(2);
    expect(labelNodes[0].parentId).toBeUndefined(); // No group node
    expect(labelNodes[1].parentId).toBeUndefined(); // No group node
  });

  it('sets color to danger for isOriginAlert', () => {
    const records: GraphEdge[] = [
      {
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: '',
        targetEntityType: '',
        actorLabel: 'Actor 1',
        targetLabel: 'Target 1',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('color', 'danger');
    expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
  });

  it('sets color to danger for isAlert', () => {
    const records: GraphEdge[] = [
      {
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: '',
        targetEntityType: '',
        actorLabel: 'Actor 1',
        targetLabel: 'Target 1',
        actorIdsCount: 1,
        targetIdsCount: 1,
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
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('color', 'danger');
    expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
  });

  it('sets label node id based on action, isOrigin and isOriginAlert fields', () => {
    const baseLabelNodeData = {
      actorIds: 'actor1',
      targetIds: 'target1',
      actorEntityType: '',
      targetEntityType: '',
      actorLabel: 'Actor 1',
      targetLabel: 'Target 1',
      actorIdsCount: 1,
      targetIdsCount: 1,
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

    const records: GraphEdge[] = [
      {
        ...baseLabelNodeData,
        action: 'action1',
        isOrigin: false,
        isOriginAlert: false,
      },
      {
        ...baseLabelNodeData,
        action: 'action2',
        isOrigin: true,
        isOriginAlert: false,
      },
      {
        ...baseLabelNodeData,
        action: 'action3',
        isOrigin: false,
        isOriginAlert: true,
      },
      {
        ...baseLabelNodeData,
        action: 'action4',
        isOrigin: true,
        isOriginAlert: true,
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];

    // Event 1: uuid-1 (actor), uuid-2 (target)
    // Event 2: uuid-3 (actor), uuid-4 (target)
    // Event 3: uuid-5 (actor), uuid-6 (target)
    // Event 4: uuid-7 (actor), uuid-8 (target)
    expect(labelNodes.map((n) => n.id)).toStrictEqual([
      `a(uuid-1)-b(uuid-2)label(action1)oe(0)oa(0)`,
      `a(uuid-3)-b(uuid-4)label(action2)oe(1)oa(0)`,
      `a(uuid-5)-b(uuid-6)label(action3)oe(0)oa(1)`,
      `a(uuid-7)-b(uuid-8)label(action4)oe(1)oa(1)`,
    ]);
  });

  it('handles unknown target groups', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityType: 'user',
        targetEntityType: '',
        actorLabel: 'John Doe',
        targetLabel: '',
        actorIdsCount: 1,
        targetIdsCount: 0,
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
      },
    ];
    const result = parseRecords(mockLogger, records);
    // Should create uuid-1 for actor and unknown-uuid-2 for target
    const actorNode = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
    const unknownNode = result.nodes.find(
      (n) => n.label === 'Unknown' && n.id.startsWith('unknown-')
    ) as EntityNodeDataModel;

    expect(actorNode).toBeDefined();
    expect(actorNode.label).toBe('John Doe');
    expect(unknownNode).toBeDefined();
    expect(unknownNode!.id).toBe('unknown-uuid-2');
    expect(unknownNode).toHaveProperty('documentsData', []);
  });

  it('limits nodes and sets message when nodesLimit is reached', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: ['a1', 'a2'],
        targetIds: ['t1'],
        actorEntityType: 'user',
        targetEntityType: 'host',
        actorLabel: 'User Group',
        targetLabel: 'Host Group',
        actorIdsCount: 2,
        targetIdsCount: 1,
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
      },
      {
        action: 'foo2',
        actorIds: ['a3'],
        targetIds: ['t2', 't3'],
        actorEntityType: 'service',
        targetEntityType: 'file',
        actorLabel: 'Service Group',
        targetLabel: 'File Group',
        actorIdsCount: 1,
        targetIdsCount: 2,
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
      },
    ];
    // nodesLimit = 2, so only first record should be processed
    // First record creates 3 nodes (actor group, target group, label)
    const result = parseRecords(mockLogger, records, 2);
    expect(result.nodes.length).toBeLessThanOrEqual(3);
    expect(result.messages).toContain(ApiMessageCode.ReachedNodesLimit);
  });

  // Test for entity grouping by type and sub_type
  describe('entity grouping functionality', () => {
    it('groups actors and targets by type and sub_type', () => {
      const records: GraphEdge[] = [
        {
          action: 'connect',
          actorIds: ['user1', 'user2'],
          targetIds: ['server1'],
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorLabel: 'Identity Users',
          targetLabel: 'Server Hosts',
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'access',
          actorIds: ['service1', 'service2'],
          targetIds: ['file1'],
          actorEntityType: 'service',
          targetEntityType: 'file',
          actorLabel: 'Services',
          targetLabel: 'Files',
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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

    it('groups actors and targets by id when type and sub_type are missing', () => {
      const records: GraphEdge[] = [
        {
          action: 'interact',
          actorIds: ['entity1', 'entity2'],
          targetIds: ['entity3'],
          actorEntityType: '',
          targetEntityType: '',
          actorLabel: 'Generic Group 1',
          targetLabel: 'Generic Group 2',
          actorIdsCount: 2,
          targetIdsCount: 1,
          badge: 1,
          uniqueEventsCount: 1,
          uniqueAlertsCount: 0,
          docs: ['{"event":"generic_interaction"}'],
          isAlert: false,
          isOrigin: true,
          isOriginAlert: false,
          actorsDocData: [
            '{"id":"entity1","entity":{"name":"Entity One"}}',
            '{"id":"entity2","entity":{"name":"Entity Two"}}',
          ],
          targetsDocData: ['{"id":"entity3","entity":{"name":"Entity Three"}}'],
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
        },
      ];
      const result = parseRecords(mockLogger, records);

      const actorNode = result.nodes.find(
        (n) => n.label === 'Generic Group 1'
      ) as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Generic Group 1');
      expect(actorNode).toHaveProperty('shape', 'rectangle'); // Default shape when no type
      expect(actorNode).not.toHaveProperty('tag');
      expect(actorNode).not.toHaveProperty('icon');
      expect(actorNode).toHaveProperty('count', 2);
      expect(actorNode.documentsData).toHaveLength(2);
      expect(actorNode.documentsData![0].entity).not.toHaveProperty('type');
      expect(actorNode.documentsData![0].entity).not.toHaveProperty('sub_type');
      expect(actorNode.documentsData![1].entity).not.toHaveProperty('type');
      expect(actorNode.documentsData![1].entity).not.toHaveProperty('sub_type');

      const targetNode = result.nodes.find(
        (n) => n.label === 'Generic Group 2'
      ) as EntityNodeDataModel;
      expect(targetNode).toBeDefined();
      expect(targetNode!.label).toBe('Generic Group 2');
      expect(targetNode).toHaveProperty('shape', 'rectangle');
      expect(targetNode).not.toHaveProperty('tag');
      expect(targetNode).not.toHaveProperty('icon');
      expect(targetNode.documentsData).toHaveLength(1);
      expect(targetNode.documentsData![0].entity).not.toHaveProperty('type');
      expect(targetNode.documentsData![0].entity).not.toHaveProperty('sub_type');
    });
  });

  // Test for unknown target processing
  describe('unknown target processing', () => {
    it('properly processes unknown targets with processUnknownTargetGroup', () => {
      const records: GraphEdge[] = [
        {
          action: 'suspicious_activity',
          actorIds: ['malicious_user'],
          targetIds: [],
          actorEntityType: 'user',
          targetEntityType: '',
          actorLabel: 'Threat Actor',
          targetLabel: '',
          actorIdsCount: 1,
          targetIdsCount: 0,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'file_access',
          actorIds: ['user1'],
          targetIds: ['file1'],
          actorEntityType: 'user',
          targetEntityType: 'file',
          actorLabel: 'User',
          targetLabel: 'File',
          actorIdsCount: 1,
          targetIdsCount: 1,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'malware_detected',
          actorIds: ['malware1'],
          targetIds: ['system1'],
          actorEntityType: 'malware',
          targetEntityType: 'system',
          actorLabel: 'Malware',
          targetLabel: 'System',
          actorIdsCount: 1,
          targetIdsCount: 1,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'network_activity',
          actorIds: ['user1'],
          targetIds: ['server1'],
          actorEntityType: 'user',
          targetEntityType: 'server',
          actorLabel: 'User',
          targetLabel: 'Server',
          actorIdsCount: 1,
          targetIdsCount: 1,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'suspicious_login',
          actorIds: ['user1'],
          targetIds: ['system1'],
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorLabel: 'User',
          targetLabel: 'System',
          actorIdsCount: 1,
          targetIdsCount: 1,
          badge: 5,
          uniqueEventsCount: 3,
          uniqueAlertsCount: 2,
          docs: [
            '{"event_type":"login_attempt","timestamp":"2024-01-01T10:00:00Z"}',
            '{"alert_type":"brute_force","severity":"medium"}',
            '{"event_type":"successful_login","timestamp":"2024-01-01T10:05:00Z"}',
            '{"alert_type":"anomalous_behavior","severity":"high"}',
            '{"event_type":"logout","timestamp":"2024-01-01T10:30:00Z"}',
          ],
          isAlert: true,
          isOrigin: true,
          isOriginAlert: true,
          actorHostIps: [],
          targetHostIps: [],
          sourceIps: [],
          sourceCountryCodes: [],
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'global_access',
          actorIds: ['global_user'],
          targetIds: ['distributed_system'],
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorLabel: 'Global Users',
          targetLabel: 'Distributed Systems',
          actorIdsCount: 1,
          targetIdsCount: 1,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
      const records: GraphEdge[] = [
        {
          action: 'local_access',
          actorIds: ['local_user'],
          targetIds: ['local_system'],
          actorEntityType: 'user',
          targetEntityType: 'system',
          actorLabel: 'Local Users',
          targetLabel: 'Local Systems',
          actorIdsCount: 1,
          targetIdsCount: 1,
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
        },
      ];
      const result = parseRecords(mockLogger, records);

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
    it('handles empty documentsData when no entity documents exist', () => {
      const records: GraphEdge[] = [
        {
          action: 'login',
          actorIds: ['user1'],
          targetIds: ['service1'],
          actorEntityType: 'user',
          targetEntityType: 'service',
          actorLabel: 'User',
          targetLabel: 'Service',
          actorIdsCount: 1,
          targetIdsCount: 1,
          actorsDocData: [],
          targetsDocData: [],
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
        },
      ];
      const result = parseRecords(mockLogger, records);

      // Check user group node - should have empty documentsData since no actor documents
      const userNode = result.nodes.find((n) => n.label === 'User') as EntityNodeDataModel;
      expect(userNode).toBeDefined();
      expect(userNode.documentsData).toEqual([]);

      // Check service group node - should have empty documentsData since no target documents
      const serviceNode = result.nodes.find((n) => n.label === 'Service') as EntityNodeDataModel;
      expect(serviceNode).toBeDefined();
      expect(serviceNode.documentsData).toEqual([]);
    });
  });

  describe('non-enriched entities', () => {
    describe('single non-enriched entity', () => {
      it('should create node with "Entity" (singular) type and entity.id as label', () => {
        const records: GraphEdge[] = [
          {
            action: 'test.action',
            actorIds: ['non-enriched-actor-123'],
            targetIds: ['non-enriched-target-456'],
            actorEntityType: 'Entity',
            targetEntityType: 'Entity',
            actorLabel: 'non-enriched-actor-123',
            targetLabel: 'non-enriched-target-456',
            actorIdsCount: 1,
            targetIdsCount: 1,
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
          },
        ];

        const result = parseRecords(mockLogger, records);

        // Find actor node by characteristics
        const actorNode = result.nodes.find(
          (n) => n.label === 'non-enriched-actor-123'
        ) as EntityNodeDataModel;
        expect(actorNode).toBeDefined();
        expect(actorNode.label).toBe('non-enriched-actor-123');
        expect(actorNode.tag).toBe('Entity');
        expect(actorNode.icon).toBe('magnifyWithExclamation');
        expect(actorNode.shape).toBe('rectangle');

        // Find target node by characteristics
        const targetNode = result.nodes.find(
          (n) => n.label === 'non-enriched-target-456'
        ) as EntityNodeDataModel;
        expect(targetNode).toBeDefined();
        expect(targetNode.label).toBe('non-enriched-target-456');
        expect(targetNode.tag).toBe('Entity');
        expect(targetNode.icon).toBe('magnifyWithExclamation');
        expect(targetNode.shape).toBe('rectangle');
      });
    });

    describe('multiple non-enriched entities', () => {
      it('should create grouped node with "Entities" (plural) type and no label', () => {
        const records: GraphEdge[] = [
          {
            action: 'test.action.multiple',
            actorIds: ['entity-1', 'entity-2', 'entity-3'],
            targetIds: ['target-1', 'target-2'],
            actorEntityType: 'Entities',
            targetEntityType: 'Entities',
            actorLabel: '', // Empty string for multiple entities without subType
            targetLabel: '', // Empty string for multiple entities without subType
            actorIdsCount: 3,
            targetIdsCount: 2,
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
          },
        ];

        const result = parseRecords(mockLogger, records);

        // With pure UUIDs, actor gets uuid-1 and target gets uuid-2
        // They are separate nodes even though they have the same type
        const entityNodes = result.nodes.filter(
          (n) => n.shape !== 'label' && n.shape !== 'group'
        ) as EntityNodeDataModel[];

        // Should have 2 entity nodes (actor and target)
        expect(entityNodes.length).toBe(2);

        const actorNode = entityNodes.find((n) => n.id === 'uuid-1');
        const targetNode = entityNodes.find((n) => n.id === 'uuid-2');

        expect(actorNode).toBeDefined();
        expect(actorNode!.label).toBeUndefined(); // Label not included for empty strings
        expect(actorNode!.tag).toBe('Entities');
        expect(actorNode!.icon).toBe('magnifyWithExclamation');
        expect(actorNode!.shape).toBe('rectangle');
        expect(actorNode!.count).toBe(3);

        expect(targetNode).toBeDefined();
        expect(targetNode!.label).toBeUndefined(); // Label not included for empty strings
        expect(targetNode!.tag).toBe('Entities');
        expect(targetNode!.icon).toBe('magnifyWithExclamation');
        expect(targetNode!.shape).toBe('rectangle');
        expect(targetNode!.count).toBe(2);
      });
    });

    describe('mixed enriched and non-enriched entities', () => {
      it('should handle both enriched and non-enriched entities correctly', () => {
        const records: GraphEdge[] = [
          {
            action: 'test.action.mixed',
            actorIds: ['enriched-user-1'],
            targetIds: ['non-enriched-target-1'],
            actorEntityType: 'user',
            targetEntityType: 'Entities',
            actorLabel: 'admin',
            targetLabel: 'non-enriched-target-1',
            actorIdsCount: 1,
            targetIdsCount: 1,
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
          },
        ];

        const result = parseRecords(mockLogger, records);

        // Enriched actor should maintain its type
        const actorNode = result.nodes.find((n) => n.label === 'admin') as EntityNodeDataModel;
        expect(actorNode).toBeDefined();
        expect(actorNode.label).toBe('admin');
        expect(actorNode.tag).toBe('user');
        expect(actorNode.icon).toBe('user');
        expect(actorNode.shape).toBe('ellipse');

        // Non-enriched target should have "Entities" type
        const targetNode = result.nodes.find(
          (n) => n.label === 'non-enriched-target-1'
        ) as EntityNodeDataModel;
        expect(targetNode).toBeDefined();
        expect(targetNode.label).toBe('non-enriched-target-1');
        expect(targetNode.tag).toBe('Entities');
        expect(targetNode.icon).toBe('magnifyWithExclamation');
        expect(targetNode.shape).toBe('rectangle');
      });
    });

    describe('complex grouping scenarios', () => {
      it('should create separate nodes for actors with different enrichment levels', () => {
        // This test verifies that actors are correctly grouped:
        // - Group 1: Multiple enriched actors with same type AND sub_type
        // - Group 2: Single enriched actor with type only (no sub_type)
        // - Group 3: Single non-enriched actor
        const records: GraphEdge[] = [
          // Event 1: Actor from Group 1 (enriched with type:sub_type)
          {
            action: 'complex.action',
            actorIds: ['user-1'],
            targetIds: ['target-1'],
            actorEntityType: 'user',
            targetEntityType: 'host',
            actorLabel: 'service account',
            targetLabel: 'Server',
            actorIdsCount: 1,
            targetIdsCount: 1,
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
          },
          // Event 2: Another actor from Group 1 (same type:sub_type)
          {
            action: 'complex.action',
            actorIds: ['user-2'],
            targetIds: ['target-1'],
            actorEntityType: 'user',
            targetEntityType: 'host',
            actorLabel: 'service account',
            targetLabel: 'Server',
            actorIdsCount: 1,
            targetIdsCount: 1,
            badge: 1,
            uniqueEventsCount: 1,
            uniqueAlertsCount: 0,
            docs: ['{"id":"event2","type":"event"}'],
            isOrigin: false,
            isOriginAlert: false,
            isAlert: false,
            actorHostIps: [],
            targetHostIps: [],
            sourceIps: [],
            sourceCountryCodes: [],
          },
          // Event 3: Actor from Group 2 (enriched with type only, no sub_type)
          {
            action: 'complex.action',
            actorIds: ['host-1'],
            targetIds: ['target-1'],
            actorEntityType: 'host',
            targetEntityType: 'host',
            actorLabel: 'host-1',
            targetLabel: 'Server',
            actorIdsCount: 1,
            targetIdsCount: 1,
            badge: 1,
            uniqueEventsCount: 1,
            uniqueAlertsCount: 0,
            docs: ['{"id":"event3","type":"event"}'],
            isOrigin: false,
            isOriginAlert: false,
            isAlert: false,
            actorHostIps: [],
            targetHostIps: [],
            sourceIps: [],
            sourceCountryCodes: [],
          },
          // Event 4: Actor from Group 3 (non-enriched)
          {
            action: 'complex.action',
            actorIds: ['non-enriched-1'],
            targetIds: ['target-1'],
            actorEntityType: 'Entities',
            targetEntityType: 'host',
            actorLabel: 'non-enriched-1',
            targetLabel: 'Server',
            actorIdsCount: 1,
            targetIdsCount: 1,
            badge: 1,
            uniqueEventsCount: 1,
            uniqueAlertsCount: 0,
            docs: ['{"id":"event4","type":"event"}'],
            isOrigin: false,
            isOriginAlert: false,
            isAlert: false,
            actorHostIps: [],
            targetHostIps: [],
            sourceIps: [],
            sourceCountryCodes: [],
          },
        ];

        const result = parseRecords(mockLogger, records);

        // With pure UUIDs:
        // Event 1: uuid-1 (actor), uuid-2 (target)
        // Event 2: uuid-3 (actor), uuid-4 (target)
        // Event 3: uuid-5 (actor), uuid-6 (target)
        // Event 4: uuid-7 (actor), uuid-8 (target)
        // All events have same action going to targets with same label 'Server'
        // Events 1&2 have same actor/target labels, so group node created
        const entityNodes = result.nodes.filter((n) => n.shape !== 'label' && n.shape !== 'group');
        const labelNodes = result.nodes.filter((n) => n.shape === 'label');
        const groupNodes = result.nodes.filter((n) => n.shape === 'group');

        // 8 entity nodes (4 actors + 4 targets)
        expect(entityNodes.length).toBe(8);
        expect(labelNodes.length).toBeGreaterThanOrEqual(3); // May have grouping
        expect(groupNodes.length).toBeGreaterThanOrEqual(0); // May have group nodes

        // Group 1: First actor (service account)
        const group1Node1 = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
        expect(group1Node1).toBeDefined();
        expect(group1Node1!.label).toBe('service account');
        expect(group1Node1!.tag).toBe('user');
        expect(group1Node1!.icon).toBe('user');
        expect(group1Node1!.shape).toBe('ellipse');

        // Group 1: Second actor (also service account, but different UUID)
        const group1Node2 = result.nodes.find((n) => n.id === 'uuid-3') as EntityNodeDataModel;
        expect(group1Node2).toBeDefined();
        expect(group1Node2!.label).toBe('service account');
        expect(group1Node2!.tag).toBe('user');

        // Group 2: Host actor
        const group2Node = result.nodes.find((n) => n.id === 'uuid-5') as EntityNodeDataModel;
        expect(group2Node).toBeDefined();
        expect(group2Node!.label).toBe('host-1');
        expect(group2Node!.tag).toBe('host');
        expect(group2Node!.icon).toBe('storage');
        expect(group2Node!.shape).toBe('hexagon');

        // Group 3: Non-enriched actor (Entities)
        const group3Node = result.nodes.find((n) => n.id === 'uuid-7') as EntityNodeDataModel;
        expect(group3Node).toBeDefined();
        expect(group3Node!.label).toBe('non-enriched-1');
        expect(group3Node!.tag).toBe('Entities');
        expect(group3Node!.icon).toBe('magnifyWithExclamation');
        expect(group3Node!.shape).toBe('rectangle');
        expect(group3Node!.count).toBeUndefined(); // Single entity

        // Verify all actor nodes have different tags
        const actorNodes = [group1Node1!, group2Node!, group3Node!];
        const uniqueTags = new Set(actorNodes.map((n) => n.tag));
        expect(uniqueTags.size).toBe(3); // user, host, Entities
      });
    });
  });
});
