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
    expect(labelNode.id).toContain('label(login)oe(1)oa(0)');
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

    // Verify single entities use entity IDs
    const actorNode = result.nodes.find((n) => n.id === 'actor1');
    const targetNode = result.nodes.find((n) => n.id === 'target1');
    expect(actorNode).toBeDefined();
    expect(targetNode).toBeDefined();
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

    // Event 1 creates: actor1 (entity ID), target1 (entity ID)
    // Event 2 creates: actor1 (reused), target1 (reused)
    // Since both events reference the same single entities, a group node IS created

    // Should have a group node since same actor and target have multiple connections
    const groupNode = result.nodes.find((n) => n.shape === 'group') as GroupNodeDataModel;
    expect(groupNode).toBeDefined();

    // Should have 2 entity nodes (1 actor + 1 target), 2 label nodes, and 1 group node = 5 nodes
    expect(result.nodes.length).toBe(5);

    // Find actor and target nodes by entity ID
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

    // All events use same single entities (actor1, target1) so they use entity IDs
    // Since it's the same actor and target with multiple actions, they should reuse IDs
    expect(labelNodes.map((n) => n.id)).toStrictEqual([
      `a(actor1)-b(target1)label(action1)oe(0)oa(0)`,
      `a(actor1)-b(target1)label(action2)oe(1)oa(0)`,
      `a(actor1)-b(target1)label(action3)oe(0)oa(1)`,
      `a(actor1)-b(target1)label(action4)oe(1)oa(1)`,
    ]);
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
  describe('enriched entities grouping', () => {
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

  describe('entities enrichment', () => {
    it('should create single non-enriched entity node with tag "Entity", label as entity.id, and no count', () => {
      const records: GraphEdge[] = [
        {
          action: 'test.action',
          actorIds: ['non-enriched-actor-123'],
          targetIds: ['non-enriched-target-456'],
          actorEntityType: 'Entity',
          targetEntityType: 'Entity',
          actorLabel: 'non-enriched-actor-123', // entity.id from ESQL
          targetLabel: 'non-enriched-target-456', // entity.id from ESQL
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

      // Find actor and target nodes by entity ID (single entities use entity IDs)
      const actorNode = result.nodes.find(
        (n) => n.id === 'non-enriched-actor-123'
      ) as EntityNodeDataModel;
      const targetNode = result.nodes.find(
        (n) => n.id === 'non-enriched-target-456'
      ) as EntityNodeDataModel;

      expect(actorNode).toBeDefined();
      expect(actorNode.label).toBe('non-enriched-actor-123'); // entity.id
      expect(actorNode.tag).toBe('Entity');
      expect(actorNode.icon).toBe('magnifyWithExclamation');
      expect(actorNode.shape).toBe('rectangle');
      expect(actorNode.count).toBeUndefined();

      expect(targetNode).toBeDefined();
      expect(targetNode.label).toBe('non-enriched-target-456'); // entity.id
      expect(targetNode.tag).toBe('Entity');
      expect(targetNode.icon).toBe('magnifyWithExclamation');
      expect(targetNode.shape).toBe('rectangle');
      expect(targetNode.count).toBeUndefined();
    });

    it('should create group non-enriched entity node with tag "Entities", label undefined, and count', () => {
      const records: GraphEdge[] = [
        {
          action: 'test.action.multiple',
          actorIds: ['entity-1', 'entity-2', 'entity-3'],
          targetIds: ['target-1', 'target-2'],
          actorEntityType: 'Entities',
          targetEntityType: 'Entities',
          actorLabel: '', // Empty string from ESQL
          targetLabel: '', // Empty string from ESQL
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

      const actorNode = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
      const targetNode = result.nodes.find((n) => n.id === 'uuid-2') as EntityNodeDataModel;

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
      const records: GraphEdge[] = [
        {
          action: 'test.action',
          actorIds: ['user-123'],
          targetIds: ['host-456'],
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorLabel: 'John Doe', // entity.name from ESQL
          targetLabel: 'web-server-01', // entity.name from ESQL
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

      // Find actor and target nodes by entity ID (single entities use entity IDs)
      const actorNode = result.nodes.find((n) => n.id === 'user-123') as EntityNodeDataModel;
      const targetNode = result.nodes.find((n) => n.id === 'host-456') as EntityNodeDataModel;

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
      const records: GraphEdge[] = [
        {
          action: 'test.action',
          actorIds: ['user-1', 'user-2', 'user-3'],
          targetIds: ['host-1', 'host-2'],
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorLabel: 'service_account', // entity.sub_type from ESQL
          targetLabel: 'server', // entity.sub_type from ESQL
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

      const actorNode = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
      const targetNode = result.nodes.find((n) => n.id === 'uuid-2') as EntityNodeDataModel;

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
      const records: GraphEdge[] = [
        {
          action: 'test.action',
          actorIds: ['user-1', 'user-2', 'user-3'],
          targetIds: ['host-1', 'host-2'],
          actorEntityType: 'user',
          targetEntityType: 'host',
          actorLabel: '', // No sub_type means no label
          targetLabel: '', // No sub_type means no label
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

      const actorNode = result.nodes.find((n) => n.id === 'uuid-1') as EntityNodeDataModel;
      const targetNode = result.nodes.find((n) => n.id === 'uuid-2') as EntityNodeDataModel;

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
});
