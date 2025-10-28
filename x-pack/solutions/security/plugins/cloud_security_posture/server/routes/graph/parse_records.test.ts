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

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
} as any;

describe('parseRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        actorEntityGroup: 'user',
        targetEntityGroup: 'host',
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

    // Should have 3 nodes: actor group, target group, label
    expect(result.nodes.length).toBe(3);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('actor1');
    expect(ids).toContain('target1');
    expect(ids.some((id) => id.includes('label(login)oe(1)oa(0)'))).toBe(true);

    // Should have 2 edges: actor->label, label->target
    expect(result.edges.length).toBe(2);
    expect(result.edges[0].source).toBe('actor1');
    expect(result.edges[0].target).toContain('label(login)oe(1)oa(0)');
    expect(result.edges[1].source).toContain('label(login)oe(1)oa(0)');
    expect(result.edges[1].target).toBe('target1');

    // Label node should have correct label and documentsData
    const labelNode = result.nodes.find((n) =>
      n.id.includes('label(login)oe(1)oa(0)')
    ) as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode!.label).toBe('login');
    expect(labelNode).toHaveProperty('documentsData', [{ foo: 'bar' }]);
    expect(labelNode).toHaveProperty('color', 'primary');
    expect(labelNode!.shape).toBe('label');
    expect(labelNode).toHaveProperty('uniqueEventsCount', 1);

    // Actor group node should have correct properties
    const actorNode = result.nodes.find((n) => n.id === 'actor1') as EntityNodeDataModel;
    expect(actorNode).toBeDefined();
    expect(actorNode!.label).toBe('John Doe');
    expect(actorNode).toHaveProperty('tag', 'user');
    expect(actorNode).toHaveProperty('icon', 'user');
    expect(actorNode).toHaveProperty('shape', 'ellipse');

    // Target group node should have correct properties
    const targetNode = result.nodes.find((n) => n.id === 'target1') as EntityNodeDataModel;
    expect(targetNode).toBeDefined();
    expect(targetNode!.label).toBe('Server 01');
    expect(targetNode).toHaveProperty('tag', 'host');
    expect(targetNode).toHaveProperty('icon', 'storage');
    expect(targetNode).toHaveProperty('shape', 'hexagon');
  });

  it('handles docs as a single string', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityGroup: 'actor1',
        targetEntityGroup: 'target1',
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
    const labelNode = result.nodes.find((n) =>
      n.id.includes('label(foo)oe(1)oa(0)')
    ) as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('documentsData', [{ a: 1 }]);
  });

  it('creates group node when multiple actions between same actor and target groups', () => {
    const records: GraphEdge[] = [
      {
        action: 'login',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityGroup: 'user',
        targetEntityGroup: 'host',
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
        actorEntityGroup: 'user',
        targetEntityGroup: 'host',
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

    // Should have a group node
    const groupNode = result.nodes.find((n) => n.shape === 'group') as GroupNodeDataModel;
    expect(groupNode).toBeDefined();
    expect(groupNode!.id).toContain('grp(');

    // Group node should be first
    expect(result.nodes[0].shape).toBe('group');

    // Each label node should have parentId set to group node id
    const labelNodes = result.nodes.filter((n) => n.shape === 'label') as LabelNodeDataModel[];
    labelNodes.forEach((ln) => {
      expect(ln.parentId).toBe(groupNode!.id);
    });

    // Edges should connect actor->group, group->label, label->group, group->target
    const actorToGroupEdge = result.edges.find(
      (edge) => edge.source === 'actor1' && edge.target === groupNode!.id
    );
    expect(actorToGroupEdge).toBeDefined();

    labelNodes.forEach((labelNode) => {
      const groupToLabelEdge = result.edges.find(
        (edge) => edge.source === groupNode!.id && edge.target === labelNode.id
      );
      expect(groupToLabelEdge).toBeDefined();

      const labelToGroupEdge = result.edges.find(
        (edge) => edge.source === labelNode.id && edge.target === groupNode!.id
      );
      expect(labelToGroupEdge).toBeDefined();
    });

    const groupToTargetEdge = result.edges.find(
      (edge) => edge.source === groupNode!.id && edge.target === 'target1'
    );
    expect(groupToTargetEdge).toBeDefined();
  });

  it('sets color to danger for isOriginAlert', () => {
    const records: GraphEdge[] = [
      {
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityGroup: 'actor1',
        targetEntityGroup: 'target1',
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
    const labelNode = result.nodes.find((n) =>
      n.id.includes('label(alert)oe(1)oa(1)')
    ) as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('color', 'danger');
    expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
  });

  it('sets color to danger for isAlert', () => {
    const records: GraphEdge[] = [
      {
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityGroup: 'actor1',
        targetEntityGroup: 'target1',
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
    const labelNode = result.nodes.find((n) =>
      n.id.includes('label(alert)oe(1)oa(0)')
    ) as LabelNodeDataModel;
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('color', 'danger');
    expect(labelNode).toHaveProperty('uniqueAlertsCount', 1);
  });

  it('sets label node id based on action, isOrigin and isOriginAlert fields', () => {
    const actorGroup = 'actor1';
    const targetGroup = 'target1';
    const baseLabelNodeData = {
      actorIds: 'actor1',
      targetIds: 'target1',
      actorEntityGroup: actorGroup,
      targetEntityGroup: targetGroup,
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

    expect(labelNodes.map((n) => n.id)).toStrictEqual([
      `a(${actorGroup})-b(${targetGroup})label(action1)oe(0)oa(0)`,
      `a(${actorGroup})-b(${targetGroup})label(action2)oe(1)oa(0)`,
      `a(${actorGroup})-b(${targetGroup})label(action3)oe(0)oa(1)`,
      `a(${actorGroup})-b(${targetGroup})label(action4)oe(1)oa(1)`,
    ]);
  });

  it('handles unknown target groups', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        targetIds: 'target1',
        actorEntityGroup: 'user',
        targetEntityGroup: undefined, // This will trigger unknown target processing
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
    // Should create a node with label 'Unknown'
    const unknownNode = result.nodes.find((n) => n.label === 'Unknown') as EntityNodeDataModel;
    expect(unknownNode).toBeDefined();
    expect(unknownNode!.id.startsWith('unknown')).toBe(true);
    expect(unknownNode).toHaveProperty('documentsData', []);
  });

  it('limits nodes and sets message when nodesLimit is reached', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: ['a1', 'a2'],
        targetIds: ['t1'],
        actorEntityGroup: 'user',
        targetEntityGroup: 'host',
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
        actorEntityGroup: 'service',
        targetEntityGroup: 'file',
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
          actorEntityGroup: 'user:identity',
          targetEntityGroup: 'host:server',
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
      const actorNode = result.nodes.find((n) => n.id === 'user1') as EntityNodeDataModel;
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
      const targetNode = result.nodes.find((n) => n.id === 'server1') as EntityNodeDataModel;
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
          actorEntityGroup: 'service',
          targetEntityGroup: 'file',
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

      const actorNode = result.nodes.find((n) => n.id === 'service1') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Services');
      expect(actorNode).toHaveProperty('tag', 'service');
      expect(actorNode).toHaveProperty('count', 2);
      expect(actorNode.documentsData).toHaveLength(2);
      expect(actorNode.documentsData![0].entity).toHaveProperty('type', 'service');
      expect(actorNode.documentsData![0].entity).not.toHaveProperty('sub_type');
      expect(actorNode.documentsData![1].entity).toHaveProperty('type', 'service');
      expect(actorNode.documentsData![1].entity).not.toHaveProperty('sub_type');

      const targetNode = result.nodes.find((n) => n.id === 'file1') as EntityNodeDataModel;
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
          actorEntityGroup: 'entity1',
          targetEntityGroup: 'entity3',
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

      const actorNode = result.nodes.find((n) => n.id === 'entity1') as EntityNodeDataModel;
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

      const targetNode = result.nodes.find((n) => n.id === 'entity3') as EntityNodeDataModel;
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
          actorEntityGroup: 'user',
          targetEntityGroup: undefined, // This triggers unknown target processing
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
      const actorNode = result.nodes.find((n) => n.id === 'malicious_user') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode!.label).toBe('Threat Actor');
      expect(actorNode).toHaveProperty('tag', 'user');

      const labelNode = result.nodes.find((n) => n.shape === 'label') as LabelNodeDataModel;
      expect(labelNode).toBeDefined();
      expect(labelNode).toHaveProperty('color', 'primary');

      // Should have proper edges
      expect(result.edges).toHaveLength(2);
      const actorToLabelEdge = result.edges.find((e) => e.source === 'malicious_user');
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'file',
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
          actorEntityGroup: 'malware1',
          targetEntityGroup: 'system1',
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'server',
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'system',
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'system',
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
      const actorNode = result.nodes.find((n) => n.id === 'global_user') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode).toHaveProperty('ips', ['192.168.1.100', '10.0.0.50']);

      // Check target node has host IPs
      const targetNode = result.nodes.find(
        (n) => n.id === 'distributed_system'
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'system',
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
      const actorNode = result.nodes.find((n) => n.id === 'local_user') as EntityNodeDataModel;
      expect(actorNode).toBeDefined();
      expect(actorNode).not.toHaveProperty('ips');

      const targetNode = result.nodes.find((n) => n.id === 'local_system') as EntityNodeDataModel;
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
          actorEntityGroup: 'user',
          targetEntityGroup: 'service',
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
      const userNode = result.nodes.find((n) => n.id === 'user1') as EntityNodeDataModel;
      expect(userNode).toBeDefined();
      expect(userNode.documentsData).toEqual([]);

      // Check service group node - should have empty documentsData since no target documents
      const serviceNode = result.nodes.find((n) => n.id === 'service1') as EntityNodeDataModel;
      expect(serviceNode).toBeDefined();
      expect(serviceNode.documentsData).toEqual([]);
    });
  });
});
