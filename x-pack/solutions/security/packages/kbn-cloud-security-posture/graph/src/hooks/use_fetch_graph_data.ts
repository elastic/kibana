/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type {
  GraphRequest,
  GraphResponse,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { EVENT_GRAPH_VISUALIZATION_API } from '../common/constants';

// =============================================================================
// DEV MOCK CONFIGURATION
// =============================================================================
// Set USE_MOCK_GRAPH_DATA to true to bypass the API and render mock graphs.
// Each entity gets a different graph scenario automatically based on its ID.
// =============================================================================

const USE_MOCK_GRAPH_DATA = true; // LOCAL DEV ONLY — hidden from git via skip-worktree

// =============================================================================
// TYPES & HELPERS
// =============================================================================

type EdgeColor = 'primary' | 'danger' | 'warning' | 'subdued';
type NodeShape =
  | 'ellipse'
  | 'hexagon'
  | 'rectangle'
  | 'diamond'
  | 'pentagon'
  | 'label'
  | 'group'
  | 'relationship';

interface EnhancedNode {
  id: string;
  label?: string;
  color?: EdgeColor;
  shape: NodeShape;
  icon?: string;
  source?: string;
  target?: string;
  parentId?: string;
  count?: number;
  uniqueAlertsCount?: number;
  uniqueEventsCount?: number;
  ips?: string[];
  countryCodes?: string[];
  tag?: string;
  documentsData?: Array<{ id: string; type: string; entity?: Record<string, unknown> }>;
  assetCriticality?: string;
  assetCriticalityCounts?: { extreme?: number; high?: number; medium?: number; low?: number };
  riskScore?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
}

const getConnectorEdgeColor = (node: EnhancedNode): EdgeColor =>
  node.shape === 'relationship' ? 'subdued' : node.color ?? 'primary';

const extractEdges = (graphData: EnhancedNode[]): GraphResponse => {
  const nodesMetadata: Record<string, { edgesIn: number; edgesOut: number }> = {};
  const connectorsMetadata: Record<
    string,
    { source: string; target: string; connectorNodes: EnhancedNode[] }
  > = {};
  const nodes: Record<string, EnhancedNode> = {};
  const edges: GraphResponse['edges'] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label' || node.shape === 'relationship') {
      const connectorNode = { ...node, id: `${node.id}connector(${node.label})` };
      const source = node.source ?? '';
      const target = node.target ?? '';
      if (connectorsMetadata[node.id]) {
        connectorsMetadata[node.id].connectorNodes.push(connectorNode);
      } else {
        connectorsMetadata[node.id] = { source, target, connectorNodes: [connectorNode] };
      }
      nodes[connectorNode.id] = connectorNode;
      nodesMetadata[source] = nodesMetadata[source] ?? { edgesIn: 0, edgesOut: 0 };
      nodesMetadata[target] = nodesMetadata[target] ?? { edgesIn: 0, edgesOut: 0 };
      nodesMetadata[source].edgesOut += 1;
      nodesMetadata[target].edgesIn += 1;
    } else {
      nodes[node.id] = node;
      nodesMetadata[node.id] = { edgesIn: 0, edgesOut: 0 };
    }
  });

  Object.values(connectorsMetadata).forEach((connector) => {
    if (connector.connectorNodes.length > 1) {
      const groupId = `grp(a(${connector.source})-b(${connector.target}))`;
      const groupNode: EnhancedNode = { id: groupId, shape: 'group' };
      nodes[groupId] = groupNode;
      const firstColor = getConnectorEdgeColor(connector.connectorNodes[0]);
      edges.push({
        id: `a(${connector.source})-b(${groupId})`,
        source: connector.source,
        target: groupId,
        color: firstColor,
        type: 'solid',
      } as GraphResponse['edges'][0]);
      edges.push({
        id: `a(${groupId})-b(${connector.target})`,
        source: groupId,
        target: connector.target,
        color: firstColor,
        type: 'solid',
      } as GraphResponse['edges'][0]);
      connector.connectorNodes.forEach((cn) => {
        (cn as EnhancedNode).parentId = groupId;
        const c = getConnectorEdgeColor(cn);
        edges.push({
          id: `a(${groupId})-b(${cn.id})`,
          source: groupId,
          target: cn.id,
          color: c,
          type: 'solid',
        } as GraphResponse['edges'][0]);
        edges.push({
          id: `a(${cn.id})-b(${groupId})`,
          source: cn.id,
          target: groupId,
          color: c,
          type: 'solid',
        } as GraphResponse['edges'][0]);
      });
    } else {
      const cn = connector.connectorNodes[0];
      const c = getConnectorEdgeColor(cn);
      edges.push({
        id: `a(${connector.source})-b(${cn.id})`,
        source: connector.source,
        target: cn.id,
        color: c,
        type: 'solid',
      } as GraphResponse['edges'][0]);
      edges.push({
        id: `a(${cn.id})-b(${connector.target})`,
        source: cn.id,
        target: connector.target,
        color: c,
        type: 'solid',
      } as GraphResponse['edges'][0]);
    }
  });

  return { nodes: Object.values(nodes).reverse() as GraphResponse['nodes'], edges };
};

// =============================================================================
// SCENARIOS — one per entity, each visually distinct
// =============================================================================

// Mirrors the AWS/OKTA attack chain from LargeGraph story
const scenarioLargeGraph = (): GraphResponse =>
  extractEdges([
    {
      // group: all metadata fields (criticality breakdown, risk range, ips, geo)
      id: 'siem-windows',
      label: 'siem-windows',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      count: 5,
      ips: ['213.180.204.3', '10.0.0.5'],
      countryCodes: ['RU', 'US'],
      assetCriticalityCounts: { extreme: 152, high: 1648, medium: 1982, low: 542 },
      riskScoreMin: 40.5,
      riskScoreMax: 90.01,
    },
    {
      id: '213.180.204.3',
      label: 'IP: 213.180.204.3',
      color: 'primary',
      shape: 'diamond',
      icon: 'globe',
      tag: 'IP Address',
      ips: ['213.180.204.3'],
      countryCodes: ['RU'],
      riskScore: 88.5,
    },
    {
      // group: only count badge visible, no metadata body
      id: 'user',
      label: 'Unknown User',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      count: 3,
    },
    {
      // single + primary: single criticality + single risk score + ip + geo + entity id
      id: 'john.doe@12345678@activedirectory',
      label: 'pluni@elastic.co',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      ips: ['10.128.0.93'],
      countryCodes: ['US'],
      assetCriticality: 'High impact',
      riskScore: 90.01,
    },
    {
      // single + primary: risk score only
      id: 'hackeruser',
      label: 'Hacker',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      riskScore: 42.3,
    },
    {
      // single + primary: no metadata
      id: 's3',
      label: 'Customer PII Data',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws_s3',
      tag: 'Other - Storage & Data Management',
    },
    {
      // single + warning: ip only
      id: 'ec2',
      label: 'AWS::EC2',
      color: 'warning',
      shape: 'rectangle',
      icon: 'aws_ec2',
      tag: 'Other - Cloud Services & Management',
      ips: ['172.31.4.22'],
      countryCodes: ['US'],
    },
    {
      id: 'aws',
      label: 'AWS CloudTrail',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws',
      tag: 'Other - Cloud Services & Management',
    },
    {
      id: 'a(siem-windows)-b(user)',
      source: 'siem-windows',
      target: 'user',
      label: 'User login to OKTA',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
    },
    {
      id: 'a(213.180.204.3)-b(user)',
      source: '213.180.204.3',
      target: 'user',
      label: 'User login to OKTA',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
    },
    {
      id: 'a(user)-b(oktauser)-1',
      source: 'user',
      target: 'oktauser',
      label: 'user.authentication.sso',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(user)-b(oktauser)-2',
      source: 'user',
      target: 'oktauser',
      label: 'AssumeRoleWithSAML',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(user)-b(oktauser)-3',
      source: 'user',
      target: 'oktauser',
      label: 'AssumeRoleWithSAML2',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(oktauser)-b(hackeruser)',
      source: 'oktauser',
      target: 'hackeruser',
      label: 'CreateUser',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(oktauser)-b(s3)',
      source: 'oktauser',
      target: 's3',
      label: 'PutObject',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(oktauser)-b(ec2)',
      source: 'oktauser',
      target: 'ec2',
      label: 'RunInstances',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(oktauser)-b(aws)',
      source: 'oktauser',
      target: 'aws',
      label: 'DeleteTrail (Failed)',
      color: 'warning',
      shape: 'label',
    },
  ]);

// Simple: single actor → single action → single target
const scenarioSimple = (entityId: string): GraphResponse =>
  extractEdges([
    {
      id: entityId,
      label: entityId.split(':').pop() ?? entityId,
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'target-role',
      label: 'CustomRole',
      color: 'primary',
      shape: 'hexagon',
      icon: 'question',
      documentsData: [
        { id: 'target-role', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: `a(${entityId})-b(target-role)`,
      source: entityId,
      target: 'target-role',
      label: 'google.iam.admin.v1.CreateRole',
      color: 'primary',
      shape: 'label',
      documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }],
    },
  ]);

// Danger: alert-heavy attack path
const scenarioAttack = (entityId: string): GraphResponse =>
  extractEdges([
    {
      id: entityId,
      label: entityId.split(':').pop() ?? entityId,
      color: 'danger',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'bastion',
      label: 'bastion-host',
      color: 'danger',
      shape: 'hexagon',
      icon: 'desktop',
      documentsData: [
        { id: 'bastion', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'db',
      label: 'db-server-01',
      color: 'warning',
      shape: 'hexagon',
      icon: 'desktop',
      documentsData: [
        { id: 'db', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    { id: 'ext-ip', label: '185.220.101.5', color: 'danger', shape: 'diamond', icon: 'globe' },
    {
      id: `a(${entityId})-b(bastion)-priv`,
      source: entityId,
      target: 'bastion',
      label: 'privilege.escalation',
      color: 'danger',
      uniqueAlertsCount: 2,
      shape: 'label',
      documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: `a(${entityId})-b(bastion)-cred`,
      source: entityId,
      target: 'bastion',
      label: 'credential.access',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-2', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(bastion)-b(db)-lat',
      source: 'bastion',
      target: 'db',
      label: 'lateral.movement',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-3', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(db)-b(ext-ip)-exfil',
      source: 'db',
      target: 'ext-ip',
      label: 'data.exfiltration',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-4', type: DOCUMENT_TYPE_ALERT }],
    },
  ]);

// Relationships: ownership + access + supervisor hierarchy
const scenarioRelationships = (entityId: string): GraphResponse =>
  extractEdges([
    {
      id: entityId,
      label: entityId.split(':').pop() ?? entityId,
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'host-1',
      label: 'prod-ec2-instance-01',
      color: 'primary',
      shape: 'pentagon',
      icon: 'processor',
      documentsData: [
        { id: 'host-1', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'host-2',
      label: 'prod-ec2-instance-02',
      color: 'primary',
      shape: 'pentagon',
      icon: 'processor',
      documentsData: [
        { id: 'host-2', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'iam-role',
      label: 'AdminRole',
      color: 'primary',
      shape: 'hexagon',
      icon: 'key',
      documentsData: [
        { id: 'iam-role', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'sub-user',
      label: 'junior.analyst',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: 'sub-user', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: `evt-login-${entityId}`,
      source: entityId,
      target: 'host-1',
      label: 'ConsoleLogin',
      color: 'primary',
      shape: 'label',
      uniqueEventsCount: 3,
      documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }],
    },
    {
      id: `evt-assume-${entityId}`,
      source: entityId,
      target: 'iam-role',
      label: 'AssumeRole',
      color: 'primary',
      shape: 'label',
      uniqueEventsCount: 1,
      documentsData: [{ id: 'evt-2', type: DOCUMENT_TYPE_EVENT }],
    },
    {
      id: `rel-owns-1-${entityId}`,
      source: entityId,
      target: 'host-1',
      label: 'Owns',
      shape: 'relationship',
    },
    {
      id: `rel-owns-2-${entityId}`,
      source: entityId,
      target: 'host-2',
      label: 'Owns',
      shape: 'relationship',
    },
    {
      id: `rel-access-${entityId}`,
      source: entityId,
      target: 'host-1',
      label: 'Has Access',
      shape: 'relationship',
    },
    {
      id: `rel-supervises-${entityId}`,
      source: entityId,
      target: 'sub-user',
      label: 'Supervises',
      shape: 'relationship',
    },
  ]);

// Warning: mixed outcomes (failed + success)
const scenarioWarning = (entityId: string): GraphResponse => {
  const grpId = `grp(a(${entityId})-b(custom-role))`;
  return {
    nodes: [
      { id: grpId, shape: 'group' },
      {
        id: entityId,
        label: entityId.split(':').pop() ?? entityId,
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
        documentsData: [
          { id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
        ],
      },
      {
        id: 'custom-role',
        label: 'CustomRole',
        color: 'primary',
        shape: 'hexagon',
        icon: 'question',
        documentsData: [
          {
            id: 'custom-role',
            type: DOCUMENT_TYPE_ENTITY,
            entity: { availableInEntityStore: true },
          },
        ],
      },
      {
        id: `${entityId}-failed`,
        label: 'google.iam.admin.v1.CreateRole',
        color: 'warning',
        shape: 'label',
        parentId: grpId,
        documentsData: [{ id: 'evt-failed', type: DOCUMENT_TYPE_EVENT }],
      },
      {
        id: `${entityId}-success`,
        label: 'google.iam.admin.v1.UpdateRole',
        color: 'primary',
        shape: 'label',
        parentId: grpId,
        documentsData: [{ id: 'evt-success', type: DOCUMENT_TYPE_EVENT }],
      },
      {
        id: `${entityId}-alert`,
        label: 'google.iam.admin.v1.DeleteRole',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
        parentId: grpId,
        documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }],
      },
    ] as GraphResponse['nodes'],
    edges: [
      { id: `e1-${entityId}`, source: entityId, target: grpId, color: 'danger', type: 'solid' },
      {
        id: `e2-${entityId}`,
        source: grpId,
        target: 'custom-role',
        color: 'danger',
        type: 'solid',
      },
      {
        id: `e3-${entityId}`,
        source: grpId,
        target: `${entityId}-failed`,
        color: 'warning',
        type: 'solid',
      },
      {
        id: `e4-${entityId}`,
        source: `${entityId}-failed`,
        target: grpId,
        color: 'warning',
        type: 'solid',
      },
      {
        id: `e5-${entityId}`,
        source: grpId,
        target: `${entityId}-success`,
        color: 'primary',
        type: 'solid',
      },
      {
        id: `e6-${entityId}`,
        source: `${entityId}-success`,
        target: grpId,
        color: 'primary',
        type: 'solid',
      },
      {
        id: `e7-${entityId}`,
        source: grpId,
        target: `${entityId}-alert`,
        color: 'danger',
        type: 'solid',
      },
      {
        id: `e8-${entityId}`,
        source: `${entityId}-alert`,
        target: grpId,
        color: 'danger',
        type: 'solid',
      },
    ] as GraphResponse['edges'],
  };
};

// Fan-out: one actor → one label → multiple targets
const scenarioFanout = (entityId: string): GraphResponse => ({
  nodes: [
    {
      id: entityId,
      label: entityId.split(':').pop() ?? entityId,
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'target-user',
      label: 'Target Identity',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      documentsData: [
        { id: 'target-user', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'target-storage',
      label: 'Customer PII Data',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws_s3',
      documentsData: [
        {
          id: 'target-storage',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true },
        },
      ],
    },
    {
      id: 'target-host',
      label: 'prod-server-01',
      color: 'warning',
      shape: 'hexagon',
      icon: 'desktop',
      documentsData: [
        { id: 'target-host', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } },
      ],
    },
    {
      id: 'target-service',
      label: 'payment-api',
      color: 'primary',
      shape: 'pentagon',
      icon: 'gear',
      documentsData: [
        {
          id: 'target-service',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true },
        },
      ],
    },
    {
      id: `label-${entityId}`,
      label: 'MultiTargetAction',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }],
    },
  ] as GraphResponse['nodes'],
  edges: [
    {
      id: `e1-${entityId}`,
      source: entityId,
      sourceShape: 'ellipse',
      target: `label-${entityId}`,
      targetShape: 'label',
      color: 'danger',
    },
    {
      id: `e2-${entityId}`,
      source: `label-${entityId}`,
      sourceShape: 'label',
      target: 'target-user',
      targetShape: 'ellipse',
      color: 'danger',
    },
    {
      id: `e3-${entityId}`,
      source: `label-${entityId}`,
      sourceShape: 'label',
      target: 'target-storage',
      targetShape: 'rectangle',
      color: 'danger',
    },
    {
      id: `e4-${entityId}`,
      source: `label-${entityId}`,
      sourceShape: 'label',
      target: 'target-host',
      targetShape: 'hexagon',
      color: 'danger',
    },
    {
      id: `e5-${entityId}`,
      source: `label-${entityId}`,
      sourceShape: 'label',
      target: 'target-service',
      targetShape: 'pentagon',
      color: 'danger',
    },
  ] as GraphResponse['edges'],
});

// Dense security: the current working multi-user attack chain
const scenarioDense = (): GraphResponse =>
  extractEdges([
    {
      id: 'user:alice.smith',
      label: 'alice.smith',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      documentsData: [
        {
          id: 'user:alice.smith',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'user' },
        },
      ],
    },
    {
      id: 'user:bob.jones',
      label: 'bob.jones',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      documentsData: [
        {
          id: 'user:bob.jones',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'user' },
        },
      ],
    },
    {
      id: 'user:carol.white',
      label: 'carol.white',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      documentsData: [
        {
          id: 'user:carol.white',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'user' },
        },
      ],
    },
    {
      id: 'user:eva.martinez',
      label: 'eva.martinez',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      documentsData: [
        {
          id: 'user:eva.martinez',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'user' },
        },
      ],
    },
    {
      id: 'host:workstation-001',
      label: 'workstation-001',
      color: 'warning',
      shape: 'hexagon',
      icon: 'desktop',
      tag: 'Host',
      documentsData: [
        {
          id: 'host:workstation-001',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'host' },
        },
      ],
    },
    {
      id: 'host:server-prod-01',
      label: 'server-prod-01',
      color: 'warning',
      shape: 'hexagon',
      icon: 'desktop',
      tag: 'Host',
      documentsData: [
        {
          id: 'host:server-prod-01',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'host' },
        },
      ],
    },
    {
      id: 'host:bastion-host',
      label: 'bastion-host',
      color: 'danger',
      shape: 'hexagon',
      icon: 'desktop',
      tag: 'Host',
      documentsData: [
        {
          id: 'host:bastion-host',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'host' },
        },
      ],
    },
    {
      id: 'host:db-server-01',
      label: 'db-server-01',
      color: 'warning',
      shape: 'hexagon',
      icon: 'desktop',
      tag: 'Host',
      documentsData: [
        {
          id: 'host:db-server-01',
          type: DOCUMENT_TYPE_ENTITY,
          entity: { availableInEntityStore: true, engine_type: 'host' },
        },
      ],
    },
    {
      id: 'ip:185.220.101.5',
      label: '185.220.101.5',
      color: 'danger',
      shape: 'diamond',
      icon: 'globe',
      tag: 'IP',
    },
    {
      id: 'ip:203.0.113.42',
      label: '203.0.113.42',
      color: 'danger',
      shape: 'diamond',
      icon: 'globe',
      tag: 'IP',
    },
    {
      id: 'a(user:alice.smith)-b(host:workstation-001)-login',
      source: 'user:alice.smith',
      target: 'host:workstation-001',
      label: 'interactive.login',
      color: 'primary',
      shape: 'label',
      documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }],
    },
    {
      id: 'a(user:alice.smith)-b(host:workstation-001)-priv',
      source: 'user:alice.smith',
      target: 'host:workstation-001',
      label: 'privilege.escalation',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(user:bob.jones)-b(host:server-prod-01)-ssh',
      source: 'user:bob.jones',
      target: 'host:server-prod-01',
      label: 'ssh.login',
      color: 'primary',
      shape: 'label',
      documentsData: [{ id: 'evt-2', type: DOCUMENT_TYPE_EVENT }],
    },
    {
      id: 'a(user:bob.jones)-b(host:server-prod-01)-lat',
      source: 'user:bob.jones',
      target: 'host:server-prod-01',
      label: 'lateral.movement',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-2', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(user:carol.white)-b(host:bastion-host)-cred',
      source: 'user:carol.white',
      target: 'host:bastion-host',
      label: 'credential.access',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-3', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(user:eva.martinez)-b(host:db-server-01)-exfil',
      source: 'user:eva.martinez',
      target: 'host:db-server-01',
      label: 'data.exfiltration',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-4', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(host:bastion-host)-b(host:server-prod-01)-lat',
      source: 'host:bastion-host',
      target: 'host:server-prod-01',
      label: 'lateral.movement',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-5', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(host:workstation-001)-b(ip:185.220.101.5)-c2',
      source: 'host:workstation-001',
      target: 'ip:185.220.101.5',
      label: 'c2.beaconing',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-6', type: DOCUMENT_TYPE_ALERT }],
    },
    {
      id: 'a(host:bastion-host)-b(ip:203.0.113.42)-out',
      source: 'host:bastion-host',
      target: 'ip:203.0.113.42',
      label: 'outbound.connection',
      color: 'danger',
      uniqueAlertsCount: 1,
      shape: 'label',
      documentsData: [{ id: 'alert-7', type: DOCUMENT_TYPE_ALERT }],
    },
  ]);

const mockEntityDocuments = (
  id: string,
  engineType?: string,
  entityType?: string
): EnhancedNode['documentsData'] => [
  {
    id,
    type: DOCUMENT_TYPE_ENTITY,
    entity: {
      availableInEntityStore: true,
      ...(engineType ? { engine_type: engineType } : {}),
      ...(entityType ? { type: entityType } : {}),
    },
  },
];

// Dev graph preview — fixed origin IDs match dev_graph_page originEventIds / entityIds
const DEV_ORIGIN_ENTITY_ID = 'john.doe';
const DEV_ORIGIN_EVENT_ID = 'dev-event-2';
const DEV_ORIGIN_ALERT_ID = 'dev-event-1';

const mockOriginDocument = (
  eventId: string,
  type: typeof DOCUMENT_TYPE_EVENT | typeof DOCUMENT_TYPE_ALERT
) => ({
  id: eventId,
  type,
  event: { id: eventId },
});

const mockEventDocument = (id: string) => ({ id, type: DOCUMENT_TYPE_EVENT });
const mockAlertDocument = (id: string) => ({ id, type: DOCUMENT_TYPE_ALERT });

/** Builds a primary IP plus enough extras to render a +99 overflow badge. */
const overflowIps = (primary: string): string[] => [
  primary,
  ...Array.from({ length: 99 }, (_, index) => `10.${Math.floor(index / 255)}.${index % 255}.1`),
];

/** Builds country codes that render a +99 overflow badge on cards (1 visible + extras). */
const overflowCountries = (primary: string, secondary?: string): string[] => [
  primary,
  ...(secondary ? [secondary] : []),
  ...Array.from({ length: secondary ? 98 : 99 }, (_, index) =>
    ['DE', 'GB', 'FR', 'JP', 'BR', 'CA', 'AU', 'IN'][index % 8]
  ),
];

/**
 * Simplified layout mock matching the design screenshot:
 * john.doe → Owns / Accesses frequently / Depends on → hosts & services,
 * then macbook → AuthenticateUser / SendData / GrantAccess → Entity Name hosts.
 */
const scenarioComplexPreview = (): GraphResponse =>
  extractEdges([
    // ── Origin user ─────────────────────────────────────────────────────────
    {
      id: DEV_ORIGIN_ENTITY_ID,
      label: 'john.doe',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      tag: 'User',
      ips: ['10.128.0.1'],
      countryCodes: ['US'],
      documentsData: mockEntityDocuments(DEV_ORIGIN_ENTITY_ID, 'user', 'User'),
    },

    // ── Directly related hosts / services ───────────────────────────────────
    {
      id: 'macbook-john-work',
      label: 'macbook-john-work',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      ips: ['10.128.0.93'],
      countryCodes: ['US'],
      documentsData: mockEntityDocuments('macbook-john-work', 'host', 'Host'),
    },
    {
      id: 'john-pc-home',
      label: 'john-pc-home',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      count: 5,
      ips: overflowIps('10.128.0.93'),
      countryCodes: overflowCountries('US'),
      documentsData: mockEntityDocuments('john-pc-home', 'host', 'Host'),
    },
    {
      id: 'admin-pc',
      label: 'admin-pc',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      count: 8,
      ips: overflowIps('192.0.2.146'),
      countryCodes: overflowCountries('US'),
      documentsData: mockEntityDocuments('admin-pc', 'host', 'Host'),
    },
    {
      id: 'entities-services',
      label: 'Entities',
      color: 'danger',
      shape: 'rectangle',
      icon: 'package',
      tag: 'Services',
      count: 15,
      ips: overflowIps('192.0.2.50'),
      countryCodes: overflowCountries('US'),
      documentsData: mockEntityDocuments('entities-services', 'service', 'Service'),
    },

    // ── Downstream hosts from macbook actions ───────────────────────────────
    {
      id: 'entity-auth-target',
      label: 'Entity Name',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      ips: ['10.128.0.20'],
      countryCodes: ['US'],
      documentsData: mockEntityDocuments('entity-auth-target', 'host', 'Host'),
    },
    {
      id: 'entity-send-target',
      label: 'Entity Name',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      count: 5,
      ips: overflowIps('10.128.0.30'),
      countryCodes: overflowCountries('US', 'RU'),
      documentsData: mockEntityDocuments('entity-send-target', 'host', 'Host'),
    },
    {
      id: 'entity-grant-target',
      label: 'Entity Name',
      color: 'primary',
      shape: 'hexagon',
      icon: 'storage',
      tag: 'Host',
      ips: ['10.128.0.40'],
      countryCodes: ['US'],
      documentsData: mockEntityDocuments('entity-grant-target', 'host', 'Host'),
    },

    // ── Relationships from john.doe ─────────────────────────────────────────
    {
      id: 'rel-owns-macbook',
      source: DEV_ORIGIN_ENTITY_ID,
      target: 'macbook-john-work',
      label: 'Owns',
      shape: 'relationship',
    },
    {
      id: 'rel-accesses-home',
      source: DEV_ORIGIN_ENTITY_ID,
      target: 'john-pc-home',
      label: 'Accesses frequently',
      shape: 'relationship',
    },
    {
      id: 'rel-depends-admin',
      source: DEV_ORIGIN_ENTITY_ID,
      target: 'admin-pc',
      label: 'Depends on',
      shape: 'relationship',
    },
    {
      id: 'rel-depends-services',
      source: DEV_ORIGIN_ENTITY_ID,
      target: 'entities-services',
      label: 'Depends on',
      shape: 'relationship',
    },

    // ── Action labels from macbook ──────────────────────────────────────────
    {
      id: 'evt-authenticate-user',
      source: 'macbook-john-work',
      target: 'entity-auth-target',
      label: 'AuthenticateUser',
      color: 'primary',
      uniqueEventsCount: 10,
      uniqueAlertsCount: 2,
      shape: 'label',
      ips: overflowIps('10.128.0.93'),
      countryCodes: overflowCountries('US', 'RU'),
      documentsData: [mockOriginDocument(DEV_ORIGIN_EVENT_ID, DOCUMENT_TYPE_EVENT)],
    },
    {
      id: 'evt-send-data',
      source: 'macbook-john-work',
      target: 'entity-send-target',
      label: 'SendData',
      color: 'primary',
      uniqueEventsCount: 30,
      uniqueAlertsCount: 1,
      shape: 'label',
      ips: overflowIps('10.128.0.93'),
      countryCodes: overflowCountries('US', 'RU'),
      documentsData: [mockEventDocument('evt-send-data-1')],
    },
    {
      id: 'evt-grant-access',
      source: 'macbook-john-work',
      target: 'entity-grant-target',
      label: 'GrantAccess',
      color: 'primary',
      uniqueEventsCount: 2,
      shape: 'label',
      ips: overflowIps('10.128.0.93'),
      countryCodes: overflowCountries('US'),
      documentsData: [mockOriginDocument(DEV_ORIGIN_ALERT_ID, DOCUMENT_TYPE_ALERT)],
    },
  ]);

// =============================================================================
// ENTITY → SCENARIO MAPPING
// Each entity ID in your Entity Analytics list gets its own distinct graph.
// The round-robin fallback ensures any new entity also gets a varied graph.
// =============================================================================

const SCENARIO_FUNCTIONS = [
  (id: string) => scenarioDense(),
  (id: string) => scenarioLargeGraph(),
  (id: string) => scenarioAttack(id),
  (id: string) => scenarioRelationships(id),
  (id: string) => scenarioWarning(id),
  (id: string) => scenarioFanout(id),
  (id: string) => scenarioSimple(id),
];

// Named overrides for specific entities — add your entity IDs here for fine control
const ENTITY_SCENARIO_MAP: Record<string, (id: string) => GraphResponse> = {
  'service:auth-service': (id) => scenarioLargeGraph(),
  'service:payment-api': (id) => scenarioFanout(id),
  'service:user-management': (id) => scenarioAttack(id),
  'service:data-pipeline': (id) => scenarioRelationships(id),
  'host:vpn-gateway': (id) => scenarioDense(),
  'host:db-server-01': (id) => scenarioWarning(id),
  'host:server-prod-01': (id) => scenarioAttack(id),
  'host:workstation-001': (id) => scenarioRelationships(id),
  'host:bastion-host': (id) => scenarioLargeGraph(),
  'host:web-server-02': (id) => scenarioFanout(id),
  'service:analytics-engine': (id) => scenarioSimple(id),
  'service:notification-service': (id) => scenarioWarning(id),
  'service:search-service': (id) => scenarioAttack(id),
  'service:file-storage': (id) => scenarioRelationships(id),
  'host:workstation-002': (id) => scenarioFanout(id),
  'host:build-agent-01': (id) => scenarioSimple(id),
  'host:laptop-eng-03': (id) => scenarioWarning(id),
  'host:mail-server-01': (id) => scenarioDense(),
  'host:api-server-03': (id) => scenarioLargeGraph(),
  'host:monitoring-host': (id) => scenarioAttack(id),
  [DEV_ORIGIN_ENTITY_ID]: () => scenarioComplexPreview(),
};

// Dev graph page (/app/security/dev-graph) — screenshot layout preview
const DEV_PREVIEW_ENTITY_IDS = new Set([DEV_ORIGIN_ENTITY_ID]);
const DEV_PREVIEW_EVENT_IDS = new Set([DEV_ORIGIN_ALERT_ID, DEV_ORIGIN_EVENT_ID]);

const ORIGIN_EVENT_SCENARIO_MAP: Record<string, (id: string) => GraphResponse> = {
  'dev-event-1': () => scenarioComplexPreview(),
  'dev-event-2': () => scenarioComplexPreview(),
};

const isDevGraphPreviewRequest = (req: GraphRequest): boolean => {
  const { entityIds, originEventIds } = req.query;

  return (
    entityIds?.some(({ id }) => DEV_PREVIEW_ENTITY_IDS.has(id)) === true ||
    originEventIds?.some(({ id }) => DEV_PREVIEW_EVENT_IDS.has(id)) === true
  );
};

/**
 * Returns a mock graph for the given entity/event IDs.
 * Tries the named map first, then falls back to round-robin by hash.
 */
const getMockGraphForRequest = (req: GraphRequest): GraphResponse => {
  if (isDevGraphPreviewRequest(req)) {
    return scenarioComplexPreview();
  }

  const entityIds = req.query.entityIds;
  const originEventIds = req.query.originEventIds;

  // Entity mode: use entity ID
  if (entityIds?.length) {
    const id = entityIds[0].id;
    if (ENTITY_SCENARIO_MAP[id]) return ENTITY_SCENARIO_MAP[id](id);
    // Round-robin fallback based on string hash
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return SCENARIO_FUNCTIONS[hash % SCENARIO_FUNCTIONS.length](id);
  }

  // Event/alert mode: use first event ID
  if (originEventIds?.length) {
    const id = originEventIds[0].id;
    if (ORIGIN_EVENT_SCENARIO_MAP[id]) return ORIGIN_EVENT_SCENARIO_MAP[id](id);
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return SCENARIO_FUNCTIONS[hash % SCENARIO_FUNCTIONS.length](id);
  }

  return scenarioDense();
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Interface for the input parameters of the useFetchGraphData hook.
 */
export interface UseFetchGraphDataParams {
  /**
   * The request object containing the query parameters for the graph data.
   */
  req: GraphRequest;
  /**
   * Optional configuration options for the query.
   */
  options?: {
    /**
     * If false, the query will not automatically run.
     * Defaults to true.
     */
    enabled?: boolean;
    /**
     * If true, the query will refetch on window focus.
     * Defaults to true.
     */
    refetchOnWindowFocus?: boolean;
    /**
     * If true, the query will keep previous data till new data received.
     * Defaults to false.
     */
    keepPreviousData?: boolean;
  };
}

/**
 * Interface for the result of the useFetchGraphData hook.
 */
export interface UseFetchGraphDataResult {
  /**
   * Indicates if the query is currently being fetched for the first time.
   */
  isLoading: boolean;
  /**
   * Indicates if the query is currently being fetched. Regardless of whether it is the initial fetch or a refetch.
   */
  isFetching: boolean;
  /**
   * Indicates if there was an error during the query.
   */
  isError: boolean;
  /**
   * The error object if an error occurred during the query.
   */
  error: unknown;
  /**
   * The data returned from the query.
   */
  data?: GraphResponse;
  /**
   * Function to manually refresh the query.
   */
  refresh: () => void;
}

export const useFetchGraphData = ({
  req,
  options,
}: UseFetchGraphDataParams): UseFetchGraphDataResult => {
  const queryClient = useQueryClient();
  const { esQuery, originEventIds, entityIds, start, end, pinnedIds } = req.query;
  const {
    services: { http },
  } = useKibana();

  const QUERY_KEY = useMemo(
    () => ['useFetchGraphData', originEventIds, entityIds, start, end, esQuery, pinnedIds],
    [end, entityIds, esQuery, originEventIds, start, pinnedIds]
  );

  // Each entity gets its own distinct graph based on its ID
  const mockResult = useMemo(
    () => ({
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      data: getMockGraphForRequest(req),
      refresh: () => {},
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(req.query.entityIds), JSON.stringify(req.query.originEventIds)]
  );

  const { isLoading, isError, data, isFetching, error } = useQuery<GraphResponse>(
    QUERY_KEY,
    async () => {
      if (!http) return Promise.reject(new Error('Http service is not available'));
      try {
        return await http.post<GraphResponse>(EVENT_GRAPH_VISUALIZATION_API, {
          version: '1',
          body: JSON.stringify(req),
        });
      } catch (err) {
        throw new Error(err.body?.message ?? err.message);
      }
    },
    {
      enabled: USE_MOCK_GRAPH_DATA ? false : options?.enabled ?? true,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
      keepPreviousData: options?.keepPreviousData ?? false,
    }
  );

  if (USE_MOCK_GRAPH_DATA) return mockResult;

  return {
    isLoading,
    isFetching,
    isError,
    data,
    error,
    refresh: () => {
      queryClient.invalidateQueries(QUERY_KEY);
    },
  };
};
