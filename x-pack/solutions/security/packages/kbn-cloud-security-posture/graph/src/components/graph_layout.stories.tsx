/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { ThemeProvider, css } from '@emotion/react';
import type { StoryObj, Meta } from '@storybook/react';
import { Writable } from '@kbn/utility-types';
import { GlobalStylesStorybookDecorator } from '../../.storybook/decorators';
import type {
  EdgeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
  EntityNodeViewModel,
  GroupNodeViewModel,
} from '.';
import { Graph } from '.';
import { MinimapProps } from './types';

// Define a type for our story args that includes custom fields for grid and minimap controls
interface GraphStoryProps extends Omit<GraphData, 'snapGrid'> {
  snapGridX?: number;
  snapGridY?: number;
  // Add individual minimap properties
  'minimap.pannable'?: boolean;
  'minimap.zoomable'?: boolean;
  'minimap.inversePan'?: boolean;
  'minimap.zoomStep'?: number;
  'minimap.offsetScale'?: number;
  'minimap.nodeColor'?: string;
  'minimap.nodeStrokeColor'?: string;
  'minimap.nodeBorderRadius'?: number;
  'minimap.nodeStrokeWidth'?: number;
  'minimap.nodeClassName'?: string;
  'minimap.bgColor'?: string;
  'minimap.maskColor'?: string;
  'minimap.maskStrokeColor'?: string;
  'minimap.maskStrokeWidth'?: number;
  'minimap.position'?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  'minimap.ariaLabel'?: string;
}

// Define a type that extends StoryObj with our custom properties
type CustomStory = StoryObj<typeof Graph> & {
  args: {
    snapGridX?: number;
    snapGridY?: number;
    'minimap.pannable'?: boolean;
    'minimap.zoomable'?: boolean;
    'minimap.inversePan'?: boolean;
    'minimap.zoomStep'?: number;
    'minimap.offsetScale'?: number;
    'minimap.nodeColor'?: string;
    'minimap.nodeStrokeColor'?: string;
    'minimap.nodeBorderRadius'?: number;
    'minimap.nodeStrokeWidth'?: number;
    'minimap.nodeClassName'?: string;
    'minimap.bgColor'?: string;
    'minimap.maskColor'?: string;
    'minimap.maskStrokeColor'?: string;
    'minimap.maskStrokeWidth'?: number;
    'minimap.position'?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    'minimap.ariaLabel'?: string;
    [key: string]: any;
  };
};

// Use a more flexible type assertion approach
const meta = {
  component: Graph,
  render: ({
    nodes,
    edges,
    interactive,
    minimap,
    snapToGrid,
    snapGridX,
    snapGridY,
    ...rest
  }: GraphStoryProps) => {
    const defaultGridX = 1;
    const defaultGridY = 1;

    // Use the individual X and Y values and apply them to the snapGrid param
    const snapGrid: [number, number] = [snapGridX ?? defaultGridX, snapGridY ?? defaultGridY];

    // Process individual minimap properties from rest
    const minimapConfig: MinimapProps = { ...minimap };

    // Extract minimap properties from the props
    Object.entries(rest).forEach(([key, value]) => {
      if (key.startsWith('minimap.')) {
        const propName = key.replace('minimap.', '') as keyof MinimapProps;
        // @ts-ignore
        minimapConfig[propName] = value;
      }
    });

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <Graph
          css={css`
            height: 100%;
            width: 100%;
          `}
          nodes={nodes}
          edges={edges}
          interactive={interactive}
          minimap={Object.keys(minimapConfig).length > 0 ? minimapConfig : minimap}
          snapToGrid={snapToGrid}
          snapGrid={snapGrid}
        />
      </ThemeProvider>
    );
  },
  title: 'Components/Graph Components/Graph Layout',
  args: {
    interactive: true,
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
  argTypes: {
    interactive: { control: 'boolean', defaultValue: true },
    snapToGrid: {
      control: 'boolean',
      defaultValue: true,
      description: 'Controls whether nodes snap to grid when moving',
      table: {
        category: 'Snap to grid',
        defaultValue: { summary: 'true' },
      },
    },
    snapGrid: {
      control: false,
      table: {
        disable: true,
      },
    },
    snapGridX: {
      control: { type: 'number', min: 1, max: 50, step: 1 },
      name: 'Horizontal Grid Size',
      description: 'Horizontal size of the grid in pixels',
      table: {
        category: 'Snap to grid',
        defaultValue: { summary: '1' },
      },
    },
    snapGridY: {
      control: { type: 'number', min: 1, max: 50, step: 1 },
      name: 'Vertical Grid Size',
      description: 'Vertical size of the grid in pixels',
      table: {
        category: 'Snap to grid',
        defaultValue: { summary: '1' },
      },
    },
    // Hide the actual minimap object control
    minimap: {
      type: 'object',
      control: true,
      // table: {
      //   disable: true,
      // },
    },
    // Add individual controls for minimap properties
    'minimap.pannable': {
      control: 'boolean',
      name: 'Minimap: Pannable',
      description: 'Enable panning in the minimap',
      table: {
        category: 'Minimap Interaction',
        defaultValue: { summary: 'true' },
      },
    },
    'minimap.zoomable': {
      control: 'boolean',
      name: 'Minimap: Zoomable',
      description: 'Enable zooming in the minimap',
      table: {
        category: 'Minimap Interaction',
        defaultValue: { summary: 'true' },
      },
    },
    'minimap.inversePan': {
      control: 'boolean',
      name: 'Minimap: Inverse Pan',
      description: 'Invert the panning direction',
      table: {
        category: 'Minimap Interaction',
        defaultValue: { summary: 'false' },
      },
    },
    'minimap.zoomStep': {
      control: { type: 'number', min: 1, max: 100, step: 1 },
      name: 'Minimap: Zoom Step',
      description: 'Step size for zooming',
      table: {
        category: 'Minimap Interaction',
        defaultValue: { summary: '10' },
      },
    },
    'minimap.offsetScale': {
      control: { type: 'number', min: 1, max: 20, step: 1 },
      name: 'Minimap: Offset Scale',
      description: 'Scale offset for the minimap',
      table: {
        category: 'Minimap Interaction',
        defaultValue: { summary: '5' },
      },
    },
    'minimap.nodeColor': {
      control: 'color',
      name: 'Minimap: Node Color',
      description: 'Color for nodes in the minimap',
      table: {
        category: 'Minimap Node Appearance',
        defaultValue: { summary: '#0077cc' },
      },
    },
    'minimap.nodeStrokeColor': {
      control: 'color',
      name: 'Minimap: Node Stroke Color',
      description: 'Stroke color for nodes',
      table: {
        category: 'Minimap Node Appearance',
        defaultValue: { summary: '#000000' },
      },
    },
    'minimap.nodeBorderRadius': {
      control: { type: 'number', min: 0, max: 20, step: 1 },
      name: 'Minimap: Node Border Radius',
      description: 'Border radius for nodes (px)',
      table: {
        category: 'Minimap Node Appearance',
        defaultValue: { summary: '2' },
      },
    },
    'minimap.nodeStrokeWidth': {
      control: { type: 'number', min: 0, max: 10, step: 1 },
      name: 'Minimap: Node Stroke Width',
      description: 'Stroke width for nodes (px)',
      table: {
        category: 'Minimap Node Appearance',
        defaultValue: { summary: '1' },
      },
    },
    'minimap.nodeClassName': {
      control: 'text',
      name: 'Minimap: Node Class Name',
      description: 'Custom CSS class for nodes',
      table: {
        category: 'Minimap Node Appearance',
        defaultValue: { summary: 'custom-minimap-node' },
      },
    },
    'minimap.bgColor': {
      control: 'color',
      name: 'Minimap: Background Color',
      description: 'Background color of the minimap',
      table: {
        category: 'Minimap Appearance',
        defaultValue: { summary: '#f5f5f5' },
      },
    },
    'minimap.maskColor': {
      control: 'text',
      name: 'Minimap: Mask Color',
      description: 'Color for the mask overlay (use rgba for transparency)',
      table: {
        category: 'Minimap Appearance',
        defaultValue: { summary: 'rgba(0, 0, 0, 0.1)' },
      },
    },
    'minimap.maskStrokeColor': {
      control: 'color',
      name: 'Minimap: Mask Stroke Color',
      description: 'Stroke color for the mask',
      table: {
        category: 'Minimap Appearance',
        defaultValue: { summary: '#333333' },
      },
    },
    'minimap.maskStrokeWidth': {
      control: { type: 'number', min: 0, max: 10, step: 1 },
      name: 'Minimap: Mask Stroke Width',
      description: 'Stroke width for the mask (px)',
      table: {
        category: 'Minimap Appearance',
        defaultValue: { summary: '1' },
      },
    },
    'minimap.position': {
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      name: 'Minimap: Position',
      description: 'Position of the minimap panel',
      table: {
        category: 'Minimap Position',
        defaultValue: { summary: 'bottom-right' },
      },
    },
    'minimap.ariaLabel': {
      control: 'text',
      name: 'Minimap: Aria Label',
      description: 'Accessibility label for the minimap',
      table: {
        category: 'Minimap Accessibility',
        defaultValue: { summary: 'Graph overview minimap' },
      },
    },
  } as ArgTypesWithDotNotation,
  decorators: [GlobalStylesStorybookDecorator],
} as Meta<typeof Graph>;

// Interface to allow dot notation in argTypes
interface ArgTypesWithDotNotation {
  [key: string]: any;
}

export default meta;

interface GraphData {
  nodes: NodeViewModel[];
  edges: EdgeViewModel[];
  interactive: boolean;
  minimap?: MinimapProps;
  snapToGrid?: boolean;
  snapGrid?: [number, number];
}

type EnhancedNodeViewModel =
  | EntityNodeViewModel
  | GroupNodeViewModel
  | (LabelNodeViewModel & { source: string; target: string });

const extractEdges = (
  graphData: EnhancedNodeViewModel[]
): { nodes: NodeViewModel[]; edges: EdgeViewModel[] } => {
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

      const edgeId = node.id;
      nodesMetadata[source].edgesOut += 1;
      nodesMetadata[target].edgesIn += 1;

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

  return { nodes: Object.values(nodes).reverse(), edges };
};

export const SimpleAPIMock: CustomStory = {
  args: {
    interactive: true,

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
        icon: 'questionInCircle',
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

    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

export const GroupWithWarningAPIMock: CustomStory = {
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
        icon: 'questionInCircle',
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
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

const baseGraph: EnhancedNodeViewModel[] = [
  {
    id: 'siem-windows',
    label: '',
    color: 'danger',
    shape: 'hexagon',
    icon: 'storage',
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
    shape: 'label',
  },
  {
    id: 'a(213.180.204.3)-b(user)',
    source: '213.180.204.3',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    shape: 'label',
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'user.authentication.sso',
    color: 'primary',
    shape: 'label',
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

export const LargeGraph: CustomStory = {
  args: {
    ...meta.args,
    ...extractEdges(baseGraph),
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

export const GraphLabelOverlayCases: CustomStory = {
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
        shape: 'label',
      },
      {
        id: 'a(newnode)-b(s3)',
        source: 'newnode',
        target: 's3',
        label: 'Overlay Label',
        color: 'danger',
        shape: 'label',
      },
    ]),
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

export const GraphStackedEdgeCases: CustomStory = {
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
        shape: 'label',
      },
    ]),
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

export const GraphLargeStackedEdgeCases: CustomStory = {
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
          shape: 'label',
        })),
    ]),
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
};

export const GraphWithMinimap: CustomStory = {
  args: {
    ...meta.args,
    ...extractEdges(baseGraph),
    // Convert the minimap object properties to dot notation to work with controls
    'minimap.pannable': true,
    'minimap.zoomable': true,
    'minimap.inversePan': false,
    'minimap.zoomStep': 10,
    'minimap.offsetScale': 5,
    'minimap.nodeColor': '#0077cc',
    'minimap.nodeStrokeColor': '#000000',
    'minimap.nodeBorderRadius': 2,
    'minimap.nodeStrokeWidth': 1,
    'minimap.nodeClassName': 'custom-minimap-node',
    'minimap.bgColor': '#f5f5f5',
    'minimap.maskColor': 'rgba(0, 0, 0, 0.1)',
    'minimap.maskStrokeColor': '#333333',
    'minimap.maskStrokeWidth': 1,
    'minimap.position': 'bottom-right',
    'minimap.ariaLabel': 'Graph overview minimap',
    snapToGrid: false,
    snapGridX: 1,
    snapGridY: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Graph with minimap enabled. Configure individual minimap properties through the controls below.',
      },
    },
    controls: {
      expanded: true,
    },
  },
};
