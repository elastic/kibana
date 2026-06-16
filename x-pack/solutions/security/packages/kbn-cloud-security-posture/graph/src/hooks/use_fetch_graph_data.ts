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

// TODO: Design review only — flip to false before merging
const USE_MOCK_GRAPH_DATA = true;

// =============================================================================
// TYPES & HELPERS
// =============================================================================

type EdgeColor = 'primary' | 'danger' | 'warning' | 'subdued';
type NodeShape = 'ellipse' | 'hexagon' | 'rectangle' | 'diamond' | 'pentagon' | 'label' | 'group' | 'relationship';

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
}

const getConnectorEdgeColor = (node: EnhancedNode): EdgeColor =>
  node.shape === 'relationship' ? 'subdued' : (node.color ?? 'primary');

const extractEdges = (graphData: EnhancedNode[]): GraphResponse => {
  const nodesMetadata: Record<string, { edgesIn: number; edgesOut: number }> = {};
  const connectorsMetadata: Record<string, { source: string; target: string; connectorNodes: EnhancedNode[] }> = {};
  const nodes: Record<string, EnhancedNode> = {};
  const edges: GraphResponse['edges'] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label' || node.shape === 'relationship') {
      const connectorNode = { ...node, id: `${node.id}connector(${node.label})` };
      const source = node.source!;
      const target = node.target!;
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
      edges.push({ id: `a(${connector.source})-b(${groupId})`, source: connector.source, target: groupId, color: firstColor, type: 'solid' } as GraphResponse['edges'][0]);
      edges.push({ id: `a(${groupId})-b(${connector.target})`, source: groupId, target: connector.target, color: firstColor, type: 'solid' } as GraphResponse['edges'][0]);
      connector.connectorNodes.forEach((cn) => {
        (cn as EnhancedNode).parentId = groupId;
        const c = getConnectorEdgeColor(cn);
        edges.push({ id: `a(${groupId})-b(${cn.id})`, source: groupId, target: cn.id, color: c, type: 'solid' } as GraphResponse['edges'][0]);
        edges.push({ id: `a(${cn.id})-b(${groupId})`, source: cn.id, target: groupId, color: c, type: 'solid' } as GraphResponse['edges'][0]);
      });
    } else {
      const cn = connector.connectorNodes[0];
      const c = getConnectorEdgeColor(cn);
      edges.push({ id: `a(${connector.source})-b(${cn.id})`, source: connector.source, target: cn.id, color: c, type: 'solid' } as GraphResponse['edges'][0]);
      edges.push({ id: `a(${cn.id})-b(${connector.target})`, source: cn.id, target: connector.target, color: c, type: 'solid' } as GraphResponse['edges'][0]);
    }
  });

  return { nodes: Object.values(nodes).reverse() as GraphResponse['nodes'], edges };
};

// =============================================================================
// SCENARIOS — one per entity, each visually distinct
// =============================================================================

// Mirrors the AWS/OKTA attack chain from LargeGraph story
const scenario_large_graph = (): GraphResponse => extractEdges([
  { id: 'siem-windows', label: 'siem-windows', color: 'danger', shape: 'hexagon', icon: 'storage', ips: ['213.180.204.3'], countryCodes: ['RU'], tag: 'Host', count: 3 },
  { id: '213.180.204.3', label: 'IP: 213.180.204.3', color: 'danger', shape: 'diamond', icon: 'globe' },
  { id: 'user', label: 'Unknown User', color: 'danger', shape: 'ellipse', icon: 'user', count: 3 },
  { id: 'oktauser', label: 'pluni@elastic.co', color: 'primary', shape: 'ellipse', icon: 'user' },
  { id: 'hackeruser', label: 'Hacker', color: 'primary', shape: 'ellipse', icon: 'user' },
  { id: 's3', label: 'Customer PII Data', color: 'primary', shape: 'rectangle', icon: 'aws_s3' },
  { id: 'ec2', label: 'AWS::EC2', color: 'primary', shape: 'rectangle', icon: 'aws_ec2' },
  { id: 'aws', label: 'AWS CloudTrail', color: 'primary', shape: 'rectangle', icon: 'aws' },
  { id: 'a(siem-windows)-b(user)', source: 'siem-windows', target: 'user', label: 'User login to OKTA', color: 'danger', uniqueAlertsCount: 1, shape: 'label' },
  { id: 'a(213.180.204.3)-b(user)', source: '213.180.204.3', target: 'user', label: 'User login to OKTA', color: 'danger', uniqueAlertsCount: 1, shape: 'label' },
  { id: 'a(user)-b(oktauser)-1', source: 'user', target: 'oktauser', label: 'user.authentication.sso', color: 'primary', shape: 'label' },
  { id: 'a(user)-b(oktauser)-2', source: 'user', target: 'oktauser', label: 'AssumeRoleWithSAML', color: 'primary', shape: 'label' },
  { id: 'a(user)-b(oktauser)-3', source: 'user', target: 'oktauser', label: 'AssumeRoleWithSAML2', color: 'primary', shape: 'label' },
  { id: 'a(oktauser)-b(hackeruser)', source: 'oktauser', target: 'hackeruser', label: 'CreateUser', color: 'primary', shape: 'label' },
  { id: 'a(oktauser)-b(s3)', source: 'oktauser', target: 's3', label: 'PutObject', color: 'primary', shape: 'label' },
  { id: 'a(oktauser)-b(ec2)', source: 'oktauser', target: 'ec2', label: 'RunInstances', color: 'primary', shape: 'label' },
  { id: 'a(oktauser)-b(aws)', source: 'oktauser', target: 'aws', label: 'DeleteTrail (Failed)', color: 'warning', shape: 'label' },
]);

// Simple: single actor → single action → single target
const scenario_simple = (entityId: string): GraphResponse => extractEdges([
  { id: entityId, label: entityId.split(':').pop() ?? entityId, color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'target-role', label: 'CustomRole', color: 'primary', shape: 'hexagon', icon: 'question', documentsData: [{ id: 'target-role', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: `a(${entityId})-b(target-role)`, source: entityId, target: 'target-role', label: 'google.iam.admin.v1.CreateRole', color: 'primary', shape: 'label', documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }] },
]);

// Danger: alert-heavy attack path
const scenario_attack = (entityId: string): GraphResponse => extractEdges([
  { id: entityId, label: entityId.split(':').pop() ?? entityId, color: 'danger', shape: 'ellipse', icon: 'user', documentsData: [{ id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'bastion', label: 'bastion-host', color: 'danger', shape: 'hexagon', icon: 'desktop', documentsData: [{ id: 'bastion', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'db', label: 'db-server-01', color: 'warning', shape: 'hexagon', icon: 'desktop', documentsData: [{ id: 'db', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'ext-ip', label: '185.220.101.5', color: 'danger', shape: 'diamond', icon: 'globe' },
  { id: `a(${entityId})-b(bastion)-priv`, source: entityId, target: 'bastion', label: 'privilege.escalation', color: 'danger', uniqueAlertsCount: 2, shape: 'label', documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }] },
  { id: `a(${entityId})-b(bastion)-cred`, source: entityId, target: 'bastion', label: 'credential.access', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-2', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(bastion)-b(db)-lat', source: 'bastion', target: 'db', label: 'lateral.movement', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-3', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(db)-b(ext-ip)-exfil', source: 'db', target: 'ext-ip', label: 'data.exfiltration', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-4', type: DOCUMENT_TYPE_ALERT }] },
]);

// Relationships: ownership + access + supervisor hierarchy
const scenario_relationships = (entityId: string): GraphResponse => extractEdges([
  { id: entityId, label: entityId.split(':').pop() ?? entityId, color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'host-1', label: 'prod-ec2-instance-01', color: 'primary', shape: 'pentagon', icon: 'processor', documentsData: [{ id: 'host-1', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'host-2', label: 'prod-ec2-instance-02', color: 'primary', shape: 'pentagon', icon: 'processor', documentsData: [{ id: 'host-2', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'iam-role', label: 'AdminRole', color: 'primary', shape: 'hexagon', icon: 'key', documentsData: [{ id: 'iam-role', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: 'sub-user', label: 'junior.analyst', color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: 'sub-user', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
  { id: `evt-login-${entityId}`, source: entityId, target: 'host-1', label: 'ConsoleLogin', color: 'primary', shape: 'label', uniqueEventsCount: 3, documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }] },
  { id: `evt-assume-${entityId}`, source: entityId, target: 'iam-role', label: 'AssumeRole', color: 'primary', shape: 'label', uniqueEventsCount: 1, documentsData: [{ id: 'evt-2', type: DOCUMENT_TYPE_EVENT }] },
  { id: `rel-owns-1-${entityId}`, source: entityId, target: 'host-1', label: 'Owns', shape: 'relationship' },
  { id: `rel-owns-2-${entityId}`, source: entityId, target: 'host-2', label: 'Owns', shape: 'relationship' },
  { id: `rel-access-${entityId}`, source: entityId, target: 'host-1', label: 'Has Access', shape: 'relationship' },
  { id: `rel-supervises-${entityId}`, source: entityId, target: 'sub-user', label: 'Supervises', shape: 'relationship' },
]);

// Warning: mixed outcomes (failed + success)
const scenario_warning = (entityId: string): GraphResponse => {
  const grpId = `grp(a(${entityId})-b(custom-role))`;
  return {
    nodes: [
      { id: grpId, shape: 'group' },
      { id: entityId, label: entityId.split(':').pop() ?? entityId, color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
      { id: 'custom-role', label: 'CustomRole', color: 'primary', shape: 'hexagon', icon: 'question', documentsData: [{ id: 'custom-role', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
      { id: `${entityId}-failed`, label: 'google.iam.admin.v1.CreateRole', color: 'warning', shape: 'label', parentId: grpId, documentsData: [{ id: 'evt-failed', type: DOCUMENT_TYPE_EVENT }] },
      { id: `${entityId}-success`, label: 'google.iam.admin.v1.UpdateRole', color: 'primary', shape: 'label', parentId: grpId, documentsData: [{ id: 'evt-success', type: DOCUMENT_TYPE_EVENT }] },
      { id: `${entityId}-alert`, label: 'google.iam.admin.v1.DeleteRole', color: 'danger', uniqueAlertsCount: 1, shape: 'label', parentId: grpId, documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }] },
    ] as GraphResponse['nodes'],
    edges: [
      { id: `e1-${entityId}`, source: entityId, target: grpId, color: 'danger', type: 'solid' },
      { id: `e2-${entityId}`, source: grpId, target: 'custom-role', color: 'danger', type: 'solid' },
      { id: `e3-${entityId}`, source: grpId, target: `${entityId}-failed`, color: 'warning', type: 'solid' },
      { id: `e4-${entityId}`, source: `${entityId}-failed`, target: grpId, color: 'warning', type: 'solid' },
      { id: `e5-${entityId}`, source: grpId, target: `${entityId}-success`, color: 'primary', type: 'solid' },
      { id: `e6-${entityId}`, source: `${entityId}-success`, target: grpId, color: 'primary', type: 'solid' },
      { id: `e7-${entityId}`, source: grpId, target: `${entityId}-alert`, color: 'danger', type: 'solid' },
      { id: `e8-${entityId}`, source: `${entityId}-alert`, target: grpId, color: 'danger', type: 'solid' },
    ] as GraphResponse['edges'],
  };
};

// Fan-out: one actor → one label → multiple targets
const scenario_fanout = (entityId: string): GraphResponse => ({
  nodes: [
    { id: entityId, label: entityId.split(':').pop() ?? entityId, color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: entityId, type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
    { id: 'target-user', label: 'Target Identity', color: 'primary', shape: 'ellipse', icon: 'user', documentsData: [{ id: 'target-user', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
    { id: 'target-storage', label: 'Customer PII Data', color: 'primary', shape: 'rectangle', icon: 'aws_s3', documentsData: [{ id: 'target-storage', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
    { id: 'target-host', label: 'prod-server-01', color: 'warning', shape: 'hexagon', icon: 'desktop', documentsData: [{ id: 'target-host', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
    { id: 'target-service', label: 'payment-api', color: 'primary', shape: 'pentagon', icon: 'gear', documentsData: [{ id: 'target-service', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true } }] },
    { id: `label-${entityId}`, label: 'MultiTargetAction', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }] },
  ] as GraphResponse['nodes'],
  edges: [
    { id: `e1-${entityId}`, source: entityId, sourceShape: 'ellipse', target: `label-${entityId}`, targetShape: 'label', color: 'danger' },
    { id: `e2-${entityId}`, source: `label-${entityId}`, sourceShape: 'label', target: 'target-user', targetShape: 'ellipse', color: 'danger' },
    { id: `e3-${entityId}`, source: `label-${entityId}`, sourceShape: 'label', target: 'target-storage', targetShape: 'rectangle', color: 'danger' },
    { id: `e4-${entityId}`, source: `label-${entityId}`, sourceShape: 'label', target: 'target-host', targetShape: 'hexagon', color: 'danger' },
    { id: `e5-${entityId}`, source: `label-${entityId}`, sourceShape: 'label', target: 'target-service', targetShape: 'pentagon', color: 'danger' },
  ] as GraphResponse['edges'],
});

// Dense security: the current working multi-user attack chain
const scenario_dense = (): GraphResponse => extractEdges([
  { id: 'user:alice.smith', label: 'alice.smith', color: 'primary', shape: 'ellipse', icon: 'user', tag: 'User', documentsData: [{ id: 'user:alice.smith', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'user' } }] },
  { id: 'user:bob.jones', label: 'bob.jones', color: 'primary', shape: 'ellipse', icon: 'user', tag: 'User', documentsData: [{ id: 'user:bob.jones', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'user' } }] },
  { id: 'user:carol.white', label: 'carol.white', color: 'primary', shape: 'ellipse', icon: 'user', tag: 'User', documentsData: [{ id: 'user:carol.white', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'user' } }] },
  { id: 'user:eva.martinez', label: 'eva.martinez', color: 'primary', shape: 'ellipse', icon: 'user', tag: 'User', documentsData: [{ id: 'user:eva.martinez', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'user' } }] },
  { id: 'host:workstation-001', label: 'workstation-001', color: 'warning', shape: 'hexagon', icon: 'desktop', tag: 'Host', documentsData: [{ id: 'host:workstation-001', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'host' } }] },
  { id: 'host:server-prod-01', label: 'server-prod-01', color: 'warning', shape: 'hexagon', icon: 'desktop', tag: 'Host', documentsData: [{ id: 'host:server-prod-01', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'host' } }] },
  { id: 'host:bastion-host', label: 'bastion-host', color: 'danger', shape: 'hexagon', icon: 'desktop', tag: 'Host', documentsData: [{ id: 'host:bastion-host', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'host' } }] },
  { id: 'host:db-server-01', label: 'db-server-01', color: 'warning', shape: 'hexagon', icon: 'desktop', tag: 'Host', documentsData: [{ id: 'host:db-server-01', type: DOCUMENT_TYPE_ENTITY, entity: { availableInEntityStore: true, engine_type: 'host' } }] },
  { id: 'ip:185.220.101.5', label: '185.220.101.5', color: 'danger', shape: 'diamond', icon: 'globe', tag: 'IP' },
  { id: 'ip:203.0.113.42', label: '203.0.113.42', color: 'danger', shape: 'diamond', icon: 'globe', tag: 'IP' },
  { id: 'a(user:alice.smith)-b(host:workstation-001)-login', source: 'user:alice.smith', target: 'host:workstation-001', label: 'interactive.login', color: 'primary', shape: 'label', documentsData: [{ id: 'evt-1', type: DOCUMENT_TYPE_EVENT }] },
  { id: 'a(user:alice.smith)-b(host:workstation-001)-priv', source: 'user:alice.smith', target: 'host:workstation-001', label: 'privilege.escalation', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-1', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(user:bob.jones)-b(host:server-prod-01)-ssh', source: 'user:bob.jones', target: 'host:server-prod-01', label: 'ssh.login', color: 'primary', shape: 'label', documentsData: [{ id: 'evt-2', type: DOCUMENT_TYPE_EVENT }] },
  { id: 'a(user:bob.jones)-b(host:server-prod-01)-lat', source: 'user:bob.jones', target: 'host:server-prod-01', label: 'lateral.movement', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-2', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(user:carol.white)-b(host:bastion-host)-cred', source: 'user:carol.white', target: 'host:bastion-host', label: 'credential.access', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-3', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(user:eva.martinez)-b(host:db-server-01)-exfil', source: 'user:eva.martinez', target: 'host:db-server-01', label: 'data.exfiltration', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-4', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(host:bastion-host)-b(host:server-prod-01)-lat', source: 'host:bastion-host', target: 'host:server-prod-01', label: 'lateral.movement', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-5', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(host:workstation-001)-b(ip:185.220.101.5)-c2', source: 'host:workstation-001', target: 'ip:185.220.101.5', label: 'c2.beaconing', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-6', type: DOCUMENT_TYPE_ALERT }] },
  { id: 'a(host:bastion-host)-b(ip:203.0.113.42)-out', source: 'host:bastion-host', target: 'ip:203.0.113.42', label: 'outbound.connection', color: 'danger', uniqueAlertsCount: 1, shape: 'label', documentsData: [{ id: 'alert-7', type: DOCUMENT_TYPE_ALERT }] },
]);

// =============================================================================
// ENTITY → SCENARIO MAPPING
// Each entity ID in your Entity Analytics list gets its own distinct graph.
// The round-robin fallback ensures any new entity also gets a varied graph.
// =============================================================================

const SCENARIO_FUNCTIONS = [
  (id: string) => scenario_dense(),
  (id: string) => scenario_large_graph(),
  (id: string) => scenario_attack(id),
  (id: string) => scenario_relationships(id),
  (id: string) => scenario_warning(id),
  (id: string) => scenario_fanout(id),
  (id: string) => scenario_simple(id),
];

// Named overrides for specific entities — add your entity IDs here for fine control
const ENTITY_SCENARIO_MAP: Record<string, (id: string) => GraphResponse> = {
  'service:auth-service':         (id) => scenario_large_graph(),
  'service:payment-api':          (id) => scenario_fanout(id),
  'service:user-management':      (id) => scenario_attack(id),
  'service:data-pipeline':        (id) => scenario_relationships(id),
  'host:vpn-gateway':             (id) => scenario_dense(),
  'host:db-server-01':            (id) => scenario_warning(id),
  'host:server-prod-01':          (id) => scenario_attack(id),
  'host:workstation-001':         (id) => scenario_relationships(id),
  'host:bastion-host':            (id) => scenario_large_graph(),
  'host:web-server-02':           (id) => scenario_fanout(id),
  'service:analytics-engine':     (id) => scenario_simple(id),
  'service:notification-service': (id) => scenario_warning(id),
  'service:search-service':       (id) => scenario_attack(id),
  'service:file-storage':         (id) => scenario_relationships(id),
  'host:workstation-002':         (id) => scenario_fanout(id),
  'host:build-agent-01':          (id) => scenario_simple(id),
  'host:laptop-eng-03':           (id) => scenario_warning(id),
  'host:mail-server-01':          (id) => scenario_dense(),
  'host:api-server-03':           (id) => scenario_large_graph(),
  'host:monitoring-host':         (id) => scenario_attack(id),
};

/**
 * Returns a mock graph for the given entity/event IDs.
 * Tries the named map first, then falls back to round-robin by hash.
 */
const getMockGraphForRequest = (req: GraphRequest): GraphResponse => {
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
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return SCENARIO_FUNCTIONS[hash % SCENARIO_FUNCTIONS.length](id);
  }

  return scenario_dense();
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
      enabled: USE_MOCK_GRAPH_DATA ? false : (options?.enabled ?? true),
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