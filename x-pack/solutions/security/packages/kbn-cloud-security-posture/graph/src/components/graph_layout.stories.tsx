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
import { GlobalStylesStorybookDecorator } from '../../.storybook/decorators';
import type {
  EdgeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
  EntityNodeViewModel,
  GroupNodeViewModel,
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
  | (LabelNodeViewModel & { source: string; target: string });

const extractEdges = (
  graphData: EnhancedNodeViewModel[]
): { nodes: NodeViewModel[]; edges: EdgeViewModel[] } => {
  // Process nodes, transform nodes of id in the format of a(source)-b(target) to edges from a to label and from label to b
  // If there are multiple edges from a to b, create a parent node and group the labels under it. The parent node will be a group node.
  // Connect from a to the group node and from the group node to all the labels. and from the labels to the group again and from the group to b.
  const nodesMetadata: { [key: string]: { edgesIn: number; edgesOut: number } } = {};
  const edgesMetadata: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  } = {};
  const labelsMetadata: {
    [key: string]: { source: string; target: string; labelsNodes: LabelNodeViewModel[] };
  } = {};
  const nodes: { [key: string]: NodeViewModel } = {};
  const edges: EdgeViewModel[] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label') {
      const labelNode: LabelNodeViewModel = { ...node, id: `${node.id}label(${node.label})` };
      const { source, target } = node;

      if (labelsMetadata[node.id]) {
        labelsMetadata[node.id].labelsNodes.push(labelNode);
      } else {
        labelsMetadata[node.id] = { source, target, labelsNodes: [labelNode] };
      }

      nodes[labelNode.id] = labelNode;

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
          edges: [labelNode.id],
        };
      }
    } else {
      nodes[node.id] = node;
      nodesMetadata[node.id] = { edgesIn: 0, edgesOut: 0 };
    }
  });

  Object.values(labelsMetadata).forEach((edge) => {
    if (edge.labelsNodes.length > 1) {
      const groupNode: NodeViewModel = {
        id: `grp(a(${edge.source})-b(${edge.target}))`,
        shape: 'group',
      };

      nodes[groupNode.id] = groupNode;
      edges.push({
        id: `a(${edge.source})-b(${groupNode.id})`,
        source: edge.source,
        sourceShape: nodes[edge.source].shape,
        target: groupNode.id,
        targetShape: groupNode.shape,
        color: edge.labelsNodes[0].color,
      });

      edges.push({
        id: `a(${groupNode.id})-b(${edge.target})`,
        source: groupNode.id,
        sourceShape: groupNode.shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
      });

      edge.labelsNodes.forEach((labelNode: Writable<LabelNodeViewModel>) => {
        labelNode.parentId = groupNode.id;

        edges.push({
          id: `a(${groupNode.id})-b(${labelNode.id})`,
          source: groupNode.id,
          sourceShape: groupNode.shape,
          target: labelNode.id,
          targetShape: labelNode.shape,
          color: labelNode.color,
        });

        edges.push({
          id: `a(${labelNode.id})-b(${groupNode.id})`,
          source: labelNode.id,
          sourceShape: labelNode.shape,
          target: groupNode.id,
          targetShape: groupNode.shape,
          color: labelNode.color,
        });
      });
    } else {
      edges.push({
        id: `a(${edge.source})-b(${edge.labelsNodes[0].id})`,
        source: edge.source,
        sourceShape: nodes[edge.source].shape,
        target: edge.labelsNodes[0].id,
        targetShape: edge.labelsNodes[0].shape,
        color: edge.labelsNodes[0].color,
      });

      edges.push({
        id: `a(${edge.labelsNodes[0].id})-b(${edge.target})`,
        source: edge.labelsNodes[0].id,
        sourceShape: edge.labelsNodes[0].shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
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
