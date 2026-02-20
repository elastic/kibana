/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider, css } from '@emotion/react';
import type { StoryObj, Meta } from '@storybook/react';
import type { Writable } from '@kbn/utility-types';
import type { EdgeColor } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { GlobalStylesStorybookDecorator } from '../../.storybook/decorators';
import type {
  EdgeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
  EntityNodeViewModel,
  GroupNodeViewModel,
  RelationshipNodeViewModel,
} from '.';
import { Graph } from '.';

type GraphPropsAndCustomArgs = React.ComponentProps<typeof Graph> & {};

const meta = {
  render: ({ nodes, edges, interactive }: Partial<GraphPropsAndCustomArgs>) => {
    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <Graph
          css={css`
            height: 100%;
            width: 100%;
          `}
          nodes={nodes ?? []}
          edges={edges ?? []}
          interactive={interactive ?? false}
        />
      </ThemeProvider>
    );
  },
  title: 'Components/Graph Components/Graph Layout',
  argTypes: {
    interactive: { control: { type: 'boolean' } },
  },
  args: {
    interactive: true,
  },
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<Partial<GraphPropsAndCustomArgs>>;

export default meta;
type Story = StoryObj<typeof Graph>;

type EnhancedNodeViewModel =
  | EntityNodeViewModel
  | GroupNodeViewModel
  | (LabelNodeViewModel & { source: string; target: string })
  | (RelationshipNodeViewModel & { source: string; target: string });

// Helper to get edge color for connector nodes (label or relationship)
const getConnectorEdgeColor = (node: LabelNodeViewModel | RelationshipNodeViewModel): EdgeColor => {
  // Relationship nodes use 'subdued' color, label nodes use their color property
  return node.shape === 'relationship' ? 'subdued' : node.color;
};

const extractEdges = (
  graphData: EnhancedNodeViewModel[]
): { nodes: NodeViewModel[]; edges: EdgeViewModel[] } => {
  // Process nodes, transform connector nodes (label/relationship) to edges
  // If there are multiple connectors from a to b, create a parent node and group them under it.
  // The parent node will be a group node.
  const nodesMetadata: { [key: string]: { edgesIn: number; edgesOut: number } } = {};
  const edgesMetadata: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  } = {};
  const connectorsMetadata: {
    [key: string]: {
      source: string;
      target: string;
      connectorNodes: Array<LabelNodeViewModel | RelationshipNodeViewModel>;
    };
  } = {};
  const nodes: { [key: string]: NodeViewModel } = {};
  const edges: EdgeViewModel[] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label' || node.shape === 'relationship') {
      const connectorNode = { ...node, id: `${node.id}connector(${node.label})` };
      const { source, target } = node;

      if (connectorsMetadata[node.id]) {
        connectorsMetadata[node.id].connectorNodes.push(connectorNode);
      } else {
        connectorsMetadata[node.id] = { source, target, connectorNodes: [connectorNode] };
      }

      nodes[connectorNode.id] = connectorNode;

      // Set metadata
      const edgeId = node.id;
      nodesMetadata[source].edgesOut += 1; // TODO: Check if source exists
      nodesMetadata[target].edgesIn += 1; // TODO: Check if target exists

      if (edgesMetadata[edgeId]) {
        edgesMetadata[edgeId].edgesStacked += 1;
        edgesMetadata[edgeId].edges.push(edgeId);
      } else {
        edgesMetadata[edgeId] = {
          source,
          target,
          edgesStacked: 1,
          edges: [connectorNode.id],
        };
      }
    } else {
      nodes[node.id] = node;
      nodesMetadata[node.id] = { edgesIn: 0, edgesOut: 0 };
    }
  });

  Object.values(connectorsMetadata).forEach((connector) => {
    if (connector.connectorNodes.length > 1) {
      const groupNode: NodeViewModel = {
        id: `grp(a(${connector.source})-b(${connector.target}))`,
        shape: 'group',
      };

      const firstConnectorColor = getConnectorEdgeColor(connector.connectorNodes[0]);

      nodes[groupNode.id] = groupNode;
      edges.push({
        id: `a(${connector.source})-b(${groupNode.id})`,
        source: connector.source,
        sourceShape: nodes[connector.source].shape,
        target: groupNode.id,
        targetShape: groupNode.shape,
        color: firstConnectorColor,
      });

      edges.push({
        id: `a(${groupNode.id})-b(${connector.target})`,
        source: groupNode.id,
        sourceShape: groupNode.shape,
        target: connector.target,
        targetShape: nodes[connector.target].shape,
        color: firstConnectorColor,
      });

      connector.connectorNodes.forEach(
        (connectorNode: Writable<LabelNodeViewModel | RelationshipNodeViewModel>) => {
          connectorNode.parentId = groupNode.id;
          const edgeColor = getConnectorEdgeColor(connectorNode);

          edges.push({
            id: `a(${groupNode.id})-b(${connectorNode.id})`,
            source: groupNode.id,
            sourceShape: groupNode.shape,
            target: connectorNode.id,
            targetShape: connectorNode.shape,
            color: edgeColor,
          });

          edges.push({
            id: `a(${connectorNode.id})-b(${groupNode.id})`,
            source: connectorNode.id,
            sourceShape: connectorNode.shape,
            target: groupNode.id,
            targetShape: groupNode.shape,
            color: edgeColor,
          });
        }
      );
    } else {
      const connectorNode = connector.connectorNodes[0];
      const edgeColor = getConnectorEdgeColor(connectorNode);

      edges.push({
        id: `a(${connector.source})-b(${connectorNode.id})`,
        source: connector.source,
        sourceShape: nodes[connector.source].shape,
        target: connectorNode.id,
        targetShape: connectorNode.shape,
        color: edgeColor,
      });

      edges.push({
        id: `a(${connectorNode.id})-b(${connector.target})`,
        source: connectorNode.id,
        sourceShape: connectorNode.shape,
        target: connector.target,
        targetShape: nodes[connector.target].shape,
        color: edgeColor,
      });
    }
  });

  // Reversing order, groups like to be first in order :D
  return { nodes: Object.values(nodes).reverse(), edges };
};

export const SimpleAPIMock: Story = {
  args: {
    interactive: false,
    nodes: [
      {
        id: 'admin@example.com',
        label: 'admin@example.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'projects/your-project-id/roles/customRole',
        label: 'projects/your-project-id/roles/customRole',
        color: 'primary',
        shape: 'hexagon',
        icon: 'question',
      },
      {
        id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        label: 'google.iam.admin.v1.CreateRole',
        source: 'admin@example.com',
        target: 'projects/your-project-id/roles/customRole',
        color: 'primary',
        shape: 'label',
      },
    ],
    edges: [
      {
        id: 'a(admin@example.com)-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
        source: 'admin@example.com',
        sourceShape: 'ellipse',
        target:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        targetShape: 'label',
        color: 'primary',
      },
      {
        id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(projects/your-project-id/roles/customRole)',
        source:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        sourceShape: 'label',
        target: 'projects/your-project-id/roles/customRole',
        targetShape: 'hexagon',
        color: 'primary',
      },
    ],
  },
};

export const GroupWithWarningAPIMock: Story = {
  args: {
    ...meta.args,
    nodes: [
      {
        id: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        shape: 'group',
      },
      {
        id: 'admin3@example.com',
        label: 'admin3@example.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'projects/your-project-id/roles/customRole',
        label: 'projects/your-project-id/roles/customRole',
        color: 'primary',
        shape: 'hexagon',
        icon: 'question',
      },
      {
        id: 'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
        label: 'google.iam.admin.v1.CreateRole',
        source: 'admin3@example.com',
        target: 'projects/your-project-id/roles/customRole',
        color: 'warning',
        shape: 'label',
        parentId: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      },
      {
        id: 'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
        label: 'google.iam.admin.v1.CreateRole',
        source: 'admin3@example.com',
        target: 'projects/your-project-id/roles/customRole',
        color: 'primary',
        shape: 'label',
        parentId: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      },
    ],
    edges: [
      {
        id: 'a(admin3@example.com)-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
        source: 'admin3@example.com',
        sourceShape: 'ellipse',
        target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        targetShape: 'group',
        color: 'primary',
      },
      {
        id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(projects/your-project-id/roles/customRole)',
        source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        sourceShape: 'group',
        target: 'projects/your-project-id/roles/customRole',
        targetShape: 'hexagon',
        color: 'primary',
      },
      {
        id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed))',
        source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        sourceShape: 'group',
        target:
          'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
        targetShape: 'label',
        color: 'warning',
      },
      {
        id: 'a(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed))-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
        source:
          'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
        sourceShape: 'label',
        target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        targetShape: 'group',
        color: 'warning',
      },
      {
        id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success))',
        source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        sourceShape: 'group',
        target:
          'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
        targetShape: 'label',
        color: 'primary',
      },
      {
        id: 'a(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success))-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
        source:
          'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
        sourceShape: 'label',
        target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
        targetShape: 'group',
        color: 'primary',
      },
    ],
  },
};

export const GroupWithAlertAPIMock: Story = {
  args: {
    ...meta.args,
    nodes: [
      {
        id: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        shape: 'group',
      },
      {
        id: 'admin@example.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'projects/your-project-id/roles/customRole',
        color: 'primary',
        shape: 'hexagon',
      },
      {
        id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        label: 'google.iam.admin.v1.CreateRole',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
        parentId: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
      },
      {
        id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
        label: 'google.iam.admin.v1.UpdateRole',
        color: 'primary',
        shape: 'label',
        parentId: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
      },
    ],
    edges: [
      {
        id: 'a(admin@example.com)-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
        source: 'admin@example.com',
        target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        color: 'danger',
        uniqueAlertsCount: 1,
        type: 'solid',
      },
      {
        id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(projects/your-project-id/roles/customRole)',
        source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        target: 'projects/your-project-id/roles/customRole',
        color: 'danger',
        uniqueAlertsCount: 1,
        type: 'solid',
      },
      {
        id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
        source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        target:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        color: 'danger',
        uniqueAlertsCount: 1,
        type: 'solid',
      },
      {
        id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
        source:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
        target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        color: 'danger',
        uniqueAlertsCount: 1,
        type: 'solid',
      },
      {
        id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole))',
        source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        target:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
        color: 'subdued',
        type: 'solid',
      },
      {
        id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole))-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
        source:
          'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
        target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
        color: 'subdued',
        type: 'solid',
      },
    ],
  },
};

const baseGraph: EnhancedNodeViewModel[] = [
  {
    id: 'siem-windows',
    label: '',
    color: 'danger',
    shape: 'hexagon',
    icon: 'storage',
    ips: ['213.180.204.3'],
    countryCodes: ['RU'],
    tag: 'Host',
    count: 3,
  },
  {
    id: '213.180.204.3',
    label: 'IP: 213.180.204.3',
    color: 'danger',
    shape: 'diamond',
    icon: 'globe',
  },
  {
    id: 'user',
    label: '',
    color: 'danger',
    shape: 'ellipse',
    icon: 'user',
    ips: ['213.180.204.3'],
    countryCodes: ['RU'],
    tag: 'Host',
    count: 3,
  },
  {
    id: 'oktauser',
    label: 'pluni@elastic.co',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'hackeruser',
    label: 'Hacker',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 's3',
    label: 'Customer PII Data',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws_s3',
  },
  {
    id: 'ec2',
    label: 'AWS::EC2',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws_ec2',
  },
  {
    id: 'aws',
    label: 'AWS CloudTrail',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws',
  },
  {
    id: 'a(siem-windows)-b(user)',
    source: 'siem-windows',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    uniqueAlertsCount: 1,
    shape: 'label',
    ips: ['85.43.21.73'],
    countryCodes: ['es', 'il', 'it'],
  },
  {
    id: 'a(213.180.204.3)-b(user)',
    source: '213.180.204.3',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    uniqueAlertsCount: 1,
    shape: 'label',
    ips: ['85.43.21.73'],
    countryCodes: ['es', 'il', 'it'],
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'user.authentication.sso',
    color: 'primary',
    shape: 'label',
    ips: ['85.43.21.73'],
    countryCodes: ['es', 'il', 'it'],
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'AssumeRoleWithSAML',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'AssumeRoleWithSAML2',
    color: 'primary',
    shape: 'label',
    ips: ['85.43.21.73'],
    countryCodes: ['es', 'il', 'it'],
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
];

const entitiesData = [
  { name: 'Suspicious ip' },
  { name: 'Admin User' },
  { name: 'Suspicious User' },
];

export const LargeGraph: Story = {
  args: {
    ...meta.args,
    ...extractEdges(baseGraph),
  },
};

export const GraphLabelOverlayCases: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      ...baseGraph,
      {
        id: 'newnode',
        label: 'New Node',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'a(newnode)-b(hackeruser)',
        source: 'newnode',
        target: 'hackeruser',
        label: 'Overlay Label',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
      },
      {
        id: 'a(newnode)-b(s3)',
        source: 'newnode',
        target: 's3',
        label: 'Overlay Label',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
      },
    ]),
  },
};

export const GraphStackedEdgeCases: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      ...baseGraph,
      {
        id: 'a(oktauser)-b(hackeruser)',
        source: 'oktauser',
        target: 'hackeruser',
        label: 'CreateUser2',
        color: 'primary',
        shape: 'label',
      },
      {
        id: 'a(siem-windows)-b(user)',
        source: 'siem-windows',
        target: 'user',
        label: 'User login to OKTA2',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
        ips: ['85.43.21.73'],
        countryCodes: ['es', 'il', 'it'],
      },
    ]),
  },
};

export const GraphLargeStackedEdgeCases: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      ...baseGraph,
      ...Array(10)
        .fill(0)
        .map<EnhancedNodeViewModel>((_v, idx) => ({
          id: 'a(oktauser)-b(hackeruser)',
          source: 'oktauser',
          target: 'hackeruser',
          label: `CreateUser${idx}`,
          color: 'primary',
          shape: 'label',
        })),
      ...Array(10)
        .fill(0)
        .map<EnhancedNodeViewModel>((_v, idx) => ({
          id: 'a(siem-windows)-b(user)',
          source: 'siem-windows',
          target: 'user',
          label: `User login to OKTA${idx}`,
          color: 'danger',
          uniqueAlertsCount: 1,
          shape: 'label',
        })),
    ]),
  },
};

const VARIANT_STACK_SIZES_NODES = 8;

export const VariantStackSizes: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      ...(Array(VARIANT_STACK_SIZES_NODES)
        .fill(0)
        .map((id, idx) => ({
          id: String.fromCharCode(97 + idx), // 'a', 'b', 'c', ...
          label: String.fromCharCode(97 + idx).toUpperCase(),
          color: 'primary',
          shape: 'ellipse',
        })) satisfies EnhancedNodeViewModel[]),
      ...Array(VARIANT_STACK_SIZES_NODES - 1)
        .fill(0)
        .map<EnhancedNodeViewModel[]>((_v, idx) =>
          Array(idx + 1)
            .fill(0)
            .map<EnhancedNodeViewModel>((_, idx2) => ({
              id: `${String.fromCharCode(97 + idx)}-${String.fromCharCode(97 + idx + 1)}`,
              source: String.fromCharCode(97 + idx),
              target: String.fromCharCode(97 + idx + 1),
              label: `${idx2}`,
              color: 'primary',
              shape: 'label',
            }))
        )
        .flat(),
    ]),
  },
};

export const GraphWithAssetInventoryData: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      ...baseGraph.map((node, index) => {
        // Add asset data to specific nodes
        if (index === 1) {
          return {
            ...node,
            label: entitiesData[0].name,
            icon: 'globe',
            documentsData: [
              {
                id: node.id,
                type: 'entity' as 'event' | 'alert' | 'entity',
              },
            ],
          };
        } else if (index === 2) {
          return {
            ...node,
            label: entitiesData[1].name,
            icon: 'user',
            documentsData: [
              {
                id: node.id,
                type: 'entity' as 'event' | 'alert' | 'entity',
              },
            ],
          };
        } else if (index === 6) {
          return {
            ...node,
            label: entitiesData[2].name,
            icon: 'storage',
            documentsData: [
              {
                id: node.id,
                type: 'entity' as 'event' | 'alert' | 'entity',
              },
            ],
          };
        }
        return node;
      }),
      // Add the same additional nodes as GraphStackedEdgeCases
      {
        id: 'a(oktauser)-b(hackeruser)',
        source: 'oktauser',
        target: 'hackeruser',
        label: 'CreateUser2',
        color: 'primary',
        shape: 'label',
      },
      {
        id: 'a(siem-windows)-b(user)',
        source: 'siem-windows',
        target: 'user',
        label: 'User login to OKTA2',
        color: 'danger',
        uniqueAlertsCount: 1,
        shape: 'label',
      },
    ]),
  },
};

export const SingleAndGroupNodes: Story = {
  args: {
    ...meta.args,
    ...extractEdges([
      // Hexagon node -> Label node -> Hexagon node with count 2
      {
        id: 'hex1',
        label: 'Hexagon Start',
        color: 'primary',
        shape: 'hexagon',
        icon: 'storage',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'hex2',
        label: 'Hexagon Middle',
        color: 'primary',
        shape: 'hexagon',
        icon: 'storage',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'hex3',
        label: 'Hexagon End',
        color: 'danger',
        shape: 'hexagon',
        icon: 'storage',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(hex1)-b(hex2)',
        source: 'hex1',
        target: 'hex2',
        label: 'Hexagon Connection',
        color: 'primary',
        shape: 'label',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(hex2)-b(hex3)',
        source: 'hex2',
        target: 'hex3',
        label: 'Hexagon Connection 2',
        color: 'danger',
        shape: 'label',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },

      // Ellipse node -> Label node -> Ellipse node with count 2
      {
        id: 'ell1',
        label: 'Ellipse Start',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'ell2',
        label: 'Ellipse Middle',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'ell3',
        label: 'Ellipse End',
        color: 'danger',
        shape: 'ellipse',
        icon: 'user',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(ell1)-b(ell2)',
        source: 'ell1',
        target: 'ell2',
        label: 'Ellipse Connection',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 1,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(ell2)-b(ell3)',
        source: 'ell2',
        target: 'ell3',
        label: 'Ellipse Connection 2',
        color: 'danger',
        shape: 'label',
        uniqueAlertsCount: 1,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },

      // Diamond node -> Label node -> Diamond node with count 2
      {
        id: 'dia1',
        label: 'Diamond Start',
        color: 'primary',
        shape: 'diamond',
        icon: 'globe',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'dia2',
        label: 'Diamond Middle',
        color: 'primary',
        shape: 'diamond',
        icon: 'globe',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'dia3',
        label: 'Diamond End',
        color: 'danger',
        shape: 'diamond',
        icon: 'globe',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(dia1)-b(dia2)',
        source: 'dia1',
        target: 'dia2',
        label: 'Diamond Connection',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(dia2)-b(dia3)',
        source: 'dia2',
        target: 'dia3',
        label: 'Diamond Connection2',
        color: 'danger',
        shape: 'label',
        uniqueAlertsCount: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },

      // Rectangle node -> Label node -> Rectangle node with count 2 -> Group of 2 label nodes -> Rectangle node 3
      {
        id: 'rect1',
        label: 'Rectangle Start',
        color: 'primary',
        shape: 'rectangle',
        icon: 'aws_s3',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'rect2',
        label: 'Rectangle Middle',
        color: 'primary',
        shape: 'rectangle',
        icon: 'aws_s3',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'rect3',
        label: 'Rectangle End',
        color: 'danger',
        shape: 'rectangle',
        icon: 'aws_s3',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(rect1)-b(rect2)',
        source: 'rect1',
        target: 'rect2',
        label: 'Rectangle Connection',
        color: 'primary',
        shape: 'label',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(rect2)-b(rect3)-label(1)',
        source: 'rect2',
        target: 'rect3',
        label: 'Rectangle Group Label 1',
        color: 'danger',
        shape: 'label',
        uniqueEventsCount: 1,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(rect2)-b(rect3)-label(2)',
        source: 'rect2',
        target: 'rect3',
        label: 'Rectangle Group Label 2',
        color: 'danger',
        shape: 'label',
        uniqueAlertsCount: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },

      // Pentagon node -> Label node -> Pentagon node with count 2 -> Group of 3 label nodes -> Pentagon node 3
      {
        id: 'pent1',
        label: 'Pentagon Start',
        color: 'primary',
        shape: 'pentagon',
        icon: 'question',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'pent2',
        label: 'Pentagon Middle',
        color: 'primary',
        shape: 'pentagon',
        icon: 'question',
        count: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'pent3',
        label: 'Pentagon End',
        color: 'danger',
        shape: 'pentagon',
        icon: 'question',
        count: 3,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(pent1)-b(pent2)',
        source: 'pent1',
        target: 'pent2',
        label: 'Pentagon Connection',
        color: 'primary',
        shape: 'label',
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(pent2)-b(pent3)-label(1)',
        source: 'pent2',
        target: 'pent3',
        label: 'Pentagon Group Label 1',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 1,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(pent2)-b(pent3)-label(2)',
        source: 'pent2',
        target: 'pent3',
        label: 'Pentagon Group Label 2',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
      {
        id: 'a(pent2)-b(pent3)-label(3)',
        source: 'pent2',
        target: 'pent3',
        label: 'Pentagon Group Label 3',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 2,
        uniqueAlertsCount: 2,
        ips: ['82.45.27.31'],
        countryCodes: ['US', 'IT'],
      },
    ]),
  },
};

/**
 * Story: Events and Relationships Combined
 * Demonstrates a realistic AWS/cloud scenario with both:
 * - Event connections (label nodes): Actions performed by a user (ConsoleLogin, AssumeRole)
 * - Relationship connections (relationship nodes): Static ownership/access relationships
 *
 * Scenario: A user logs into a host, assumes a role, and has ownership/access relationships to multiple hosts
 */
export const EventsAndEntityRelationships: Story = {
  args: {
    ...extractEdges([
      // Entity nodes
      {
        id: 'user-john',
        label: 'john.doe@company.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'host-prod-1',
        label: 'prod-ec2-instance-01',
        color: 'primary',
        shape: 'pentagon',
        icon: 'compute',
      },
      {
        id: 'host-prod-2',
        label: 'prod-ec2-instance-02',
        color: 'primary',
        shape: 'pentagon',
        icon: 'compute',
      },
      {
        id: 'iam-role',
        label: 'AdminRole',
        color: 'primary',
        shape: 'hexagon',
        icon: 'key',
      },

      // Event edges (activity-based) - Actions performed by the user
      {
        id: 'evt-console-login',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'ConsoleLogin',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 3,
      },
      {
        id: 'evt-assume-role',
        source: 'user-john',
        target: 'iam-role',
        label: 'AssumeRole',
        color: 'primary',
        shape: 'label',
        uniqueEventsCount: 1,
      },

      // Relationship edges (static/configuration-based) - Ownership and access permissions
      {
        id: 'rel-user-owns-host1',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'Owns',
        shape: 'relationship',
      },
      {
        id: 'rel-user-owns-host2',
        source: 'user-john',
        target: 'host-prod-2',
        label: 'Owns',
        shape: 'relationship',
      },
      {
        id: 'rel-user-access-host1',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'Has Access',
        shape: 'relationship',
      },
    ]),
  },
};

export const EventsAndRelationshipsStacked: Story = {
  args: {
    ...extractEdges([
      // Entity nodes
      {
        id: 'user-john',
        label: 'john.doe@company.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'host-prod-1',
        label: 'prod-ec2-instance-01',
        color: 'primary',
        shape: 'pentagon',
        icon: 'compute',
      },
      // Relationship edges (static/configuration-based) - Ownership and access permissions
      // Nodes with the same id + same source/target will be stacked together
      {
        id: 'a(user-john)-b(host-prod-1)',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'Owns',
        shape: 'relationship',
      },
      {
        id: 'a(user-john)-b(host-prod-1)',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'Has Access',
        shape: 'relationship',
      },
      {
        id: 'a(user-john)-b(host-prod-1)',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'ConsoleLogin',
        shape: 'label',
        color: 'primary',
      },
      {
        id: 'a(user-john)-b(host-prod-1)',
        source: 'user-john',
        target: 'host-prod-1',
        label: 'DescribeInstance',
        shape: 'label',
        color: 'primary',
      },

      // Additional entity nodes for multi-user ownership scenario
      {
        id: 'user-1',
        label: 'user-1@company.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'user-2',
        label: 'user-2@company.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'hosts-group',
        label: 'hosts',
        color: 'primary',
        shape: 'pentagon',
        icon: 'compute',
        count: 3,
      },

      // Connect subgraphs: user-john supervises user-1 and user-2
      {
        id: 'a(user-john)-b(user-1)',
        source: 'user-john',
        target: 'user-1',
        label: 'Supervises',
        shape: 'relationship',
      },
      {
        id: 'a(user-john)-b(user-2)',
        source: 'user-john',
        target: 'user-2',
        label: 'Supervises',
        shape: 'relationship',
      },

      // user-1 owns and has access to hosts (stacked)
      {
        id: 'a(user-1)-b(hosts-group)',
        source: 'user-1',
        target: 'hosts-group',
        label: 'Owns',
        shape: 'relationship',
      },
      {
        id: 'a(user-1)-b(hosts-group)',
        source: 'user-1',
        target: 'hosts-group',
        label: 'Has Access',
        shape: 'relationship',
      },

      // user-2 owns and has access to the same hosts (stacked)
      {
        id: 'a(user-2)-b(hosts-group)',
        source: 'user-2',
        target: 'hosts-group',
        label: 'Owns',
        shape: 'relationship',
      },
      {
        id: 'a(user-2)-b(hosts-group)',
        source: 'user-2',
        target: 'hosts-group',
        label: 'Has Access',
        shape: 'relationship',
      },
    ]),
  },
};

/**
 * This story tests the fan-out layout with three target nodes
 * to verify proper distribution when there are more than two targets.
 *
 * Graph structure:
 *   Actor → Label → Target1
 *                ├─→ Target2
 *                └─→ Target3
 */
export const FanOutThreeTargets: Story = {
  args: {
    ...meta.args,
    nodes: [
      {
        id: 'actor',
        label: 'actor@example.com',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'target1',
        label: 'Target Identity 1',
        color: 'primary',
        shape: 'ellipse',
        icon: 'user',
      },
      {
        id: 'target2',
        label: 'Target Storage 2',
        color: 'primary',
        shape: 'hexagon',
        icon: 'storage',
      },
      {
        id: 'target3',
        label: 'Target Resource 3',
        color: 'primary',
        shape: 'rectangle',
        icon: 'question',
      },
      {
        id: 'label',
        label: 'MultiTargetAction',
        color: 'primary',
        shape: 'label',
      },
    ],
    edges: [
      {
        id: 'a(actor)-b(label)',
        source: 'actor',
        sourceShape: 'ellipse',
        target: 'label',
        targetShape: 'label',
        color: 'primary',
      },
      {
        id: 'a(label)-b(target1)',
        source: 'label',
        sourceShape: 'label',
        target: 'target1',
        targetShape: 'ellipse',
        color: 'primary',
      },
      {
        id: 'a(label)-b(target2)',
        source: 'label',
        sourceShape: 'label',
        target: 'target2',
        targetShape: 'hexagon',
        color: 'primary',
      },
      {
        id: 'a(label)-b(target3)',
        source: 'label',
        sourceShape: 'label',
        target: 'target3',
        targetShape: 'rectangle',
        color: 'primary',
      },
    ],
  },
};
