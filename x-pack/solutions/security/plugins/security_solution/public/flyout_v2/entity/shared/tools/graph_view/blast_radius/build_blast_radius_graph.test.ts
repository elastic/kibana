/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphTraversalOutput } from '@kbn/entity-store/common';
import type { EntityNodeViewModel } from '@kbn/cloud-security-posture-graph';
import {
  buildBlastRadiusGraph,
  EXCLUDE_NODE_TEST_SUBJECT,
  inferBlastRadiusNodeKind,
  relationLabel,
  shortBlastRadiusLabel,
} from './build_blast_radius_graph';

const SEED = 'user:john.doe@acmecrm.com@okta';
const ROLE = 'arn:aws:iam::111111111111:role/okta-prod-admin';
const PIPELINE = 'arn:aws:iam::111111111111:role/data-pipeline';
const INSTANCE = 'arn:aws:ec2:us-east-1:111111111111:instance/i-0123456789abcdef0';
const BUCKET = 'arn:aws:s3:::acme-customer-pii';

const output: GraphTraversalOutput = {
  scenario_id: 'okta-user-to-aws-resources',
  scenario_name: 'Okta user to AWS resources',
  seed_id: SEED,
  hops_planned: 6,
  hops_executed: 4,
  stop_reason: 'frontier_exhausted',
  truncated: false,
  node_count: 5,
  edge_count: 4,
  nodes: [
    { id: SEED, hop: 0, via: 'seed', type: 'user' },
    { id: ROLE, hop: 1, via: 'can_assume', type: 'role' },
    { id: PIPELINE, hop: 2, via: 'can_assume', type: 'asset' },
    { id: INSTANCE, hop: 3, via: 'can_connect', type: 'asset' },
    { id: BUCKET, hop: 4, via: 'grants_access_to', type: 'asset' },
  ],
  edges: [
    { hop: 1, relation: 'can_assume', source: SEED, target: ROLE, count: 1 },
    { hop: 2, relation: 'can_assume', source: ROLE, target: PIPELINE, count: 1 },
    { hop: 3, relation: 'can_connect', source: PIPELINE, target: INSTANCE, count: 1 },
    { hop: 4, relation: 'grants_access_to', source: INSTANCE, target: BUCKET, count: 2 },
  ],
};

describe('buildBlastRadiusGraph', () => {
  it('creates an entity node per traversed node and a label node per edge', () => {
    const { nodes, edges } = buildBlastRadiusGraph(output);

    const entityNodes = nodes.filter((node) => node.shape !== 'label');
    const labelNodes = nodes.filter((node) => node.shape === 'label');
    expect(entityNodes.map((node) => node.id)).toEqual([SEED, ROLE, PIPELINE, INSTANCE, BUCKET]);
    expect(labelNodes).toHaveLength(4);
    expect(edges).toHaveLength(8);
  });

  it('wires each relation as source -> label -> target', () => {
    const { nodes, edges } = buildBlastRadiusGraph(output);
    const label = nodes.find((node) => node.shape === 'label' && node.label === 'grants access to');

    expect(label).toBeDefined();
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: INSTANCE, target: label?.id }),
        expect.objectContaining({ source: label?.id, target: BUCKET }),
      ])
    );
  });

  it('marks the seed as compromised and everything else as primary', () => {
    const { nodes } = buildBlastRadiusGraph(output);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get(SEED)).toMatchObject({ color: 'danger', shape: 'ellipse', icon: 'user' });
    expect(byId.get(ROLE)).toMatchObject({ color: 'primary', tag: 'IAM role' });
    expect(byId.get(INSTANCE)).toMatchObject({ tag: 'EC2 instance', icon: 'compute' });
    expect(byId.get(BUCKET)).toMatchObject({ tag: 'S3 bucket', icon: 'storage' });
  });

  it('uses short labels', () => {
    const { nodes } = buildBlastRadiusGraph(output);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get(SEED)?.label).toBe('john.doe@acmecrm.com');
    expect(byId.get(ROLE)?.label).toBe('okta-prod-admin');
    expect(byId.get(INSTANCE)?.label).toBe('i-0123456789abcdef0');
    expect(byId.get(BUCKET)?.label).toBe('acme-customer-pii');
  });

  it('drops duplicate nodes and edges whose endpoints were not admitted', () => {
    const { nodes, edges } = buildBlastRadiusGraph({
      ...output,
      nodes: [...output.nodes, { id: ROLE, hop: 3, via: 'can_assume' }],
      edges: [
        ...output.edges,
        output.edges[0],
        {
          hop: 5,
          relation: 'can_assume',
          source: BUCKET,
          target: 'arn:aws:iam::1:role/x',
          count: 1,
        },
      ],
    });

    expect(nodes.filter((node) => node.id === ROLE)).toHaveLength(1);
    expect(edges).toHaveLength(8);
  });
});

describe('buildBlastRadiusGraph exclusions and labels', () => {
  it('offers an exclude action on every node but the seed when a handler is given', () => {
    const onExcludeNode = jest.fn();
    const { nodes } = buildBlastRadiusGraph(output, { onExcludeNode });
    const byId = new Map(nodes.map((node) => [node.id, node as EntityNodeViewModel]));

    expect(byId.get(SEED)?.toolbarItemsFn).toBeUndefined();
    const items = byId.get(ROLE)?.toolbarItemsFn?.({} as never) ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      iconType: 'eyeClosed',
      testSubject: EXCLUDE_NODE_TEST_SUBJECT,
    });
    items[0].onClick();
    expect(onExcludeNode).toHaveBeenCalledWith(ROLE);
  });

  it('offers no action without a handler', () => {
    const { nodes } = buildBlastRadiusGraph(output);
    expect(nodes.every((node) => !('toolbarItemsFn' in node))).toBe(true);
  });

  it('qualifies colliding labels with the ARN account so same-named roles can be told apart', () => {
    const devA = 'arn:aws:iam::500757940606:role/okta-developer';
    const devB = 'arn:aws:iam::573126453893:role/okta-developer';
    const { nodes } = buildBlastRadiusGraph({
      ...output,
      nodes: [
        { id: SEED, hop: 0, via: 'seed' },
        { id: devA, hop: 1, via: 'can_assume' },
        { id: devB, hop: 1, via: 'can_assume' },
        { id: ROLE, hop: 1, via: 'can_assume' },
      ],
      edges: [],
    });
    const labels = new Map(nodes.map((node) => [node.id, node.label]));

    expect(labels.get(devA)).toBe('okta-developer (500757940606)');
    expect(labels.get(devB)).toBe('okta-developer (573126453893)');
    expect(labels.get(ROLE)).toBe('okta-prod-admin');
  });
});

describe('buildBlastRadiusGraph with resolved nodes', () => {
  const resolvedOutput: GraphTraversalOutput = {
    ...output,
    nodes: [
      {
        id: SEED,
        hop: 0,
        via: 'seed',
        type: 'user',
        euid: SEED,
        resolved: true,
        entity: {
          name: 'John Doe',
          type: 'Identity',
          engine_type: 'user',
          sources: ['entityanalytics_okta'],
          risk_score: 73.5,
        },
      },
      { id: ROLE, hop: 1, via: 'can_assume', type: 'role', euid: ROLE, resolved: false },
      {
        id: BUCKET,
        hop: 4,
        via: 'grants_access_to',
        type: 'asset',
        euid: BUCKET,
        resolved: true,
        entity: {
          name: 'acme-customer-pii',
          type: 'Storage Bucket',
          sub_type: 'AWS S3 Bucket',
          engine_type: 'generic',
          criticality: 'extreme_impact',
        },
      },
    ],
    edges: [
      { hop: 1, relation: 'can_assume', source: SEED, target: ROLE, count: 1 },
      { hop: 4, relation: 'grants_access_to', source: ROLE, target: BUCKET, count: 2 },
    ],
  };

  it('uses the stored name and sub type and attaches the entity as the node document', () => {
    const { nodes } = buildBlastRadiusGraph(resolvedOutput);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get(SEED)).toMatchObject({
      label: 'John Doe',
      color: 'danger',
      riskScore: { min: 73.5, max: 73.5 },
      documentsData: [
        {
          id: SEED,
          type: 'entity',
          entity: { availableInEntityStore: true, name: 'John Doe', engine_type: 'user' },
        },
      ],
    });
    expect(byId.get(BUCKET)).toMatchObject({
      label: 'acme-customer-pii',
      tag: 'AWS S3 Bucket',
      shape: 'rectangle',
      assetCriticality: [{ level: 'extreme_impact', count: 1 }],
    });
  });

  it('leaves unresolved nodes without a document and falls back to the id', () => {
    const { nodes } = buildBlastRadiusGraph(resolvedOutput);
    const role = nodes.find((node) => node.id === ROLE);

    expect(role).toMatchObject({ label: 'okta-prod-admin', tag: 'IAM role' });
    expect(role).not.toHaveProperty('documentsData');
    expect(role).not.toHaveProperty('assetCriticality');
  });
});

describe('inferBlastRadiusNodeKind', () => {
  it.each([
    [ROLE, 'role'],
    ['arn:aws:iam::1:policy/ReadOnly', 'policy'],
    [INSTANCE, 'instance'],
    [BUCKET, 'bucket'],
    [SEED, 'user'],
    ['host:i-1@aws', 'host'],
    ['service:api@local', 'service'],
    ['something-else', 'entity'],
  ])('%s -> %s', (id, kind) => {
    expect(inferBlastRadiusNodeKind(id)).toBe(kind);
  });

  it('prefers what the entity store says about a resolved node', () => {
    expect(inferBlastRadiusNodeKind('some-id', 'asset', { engine_type: 'host' })).toBe('host');
    expect(inferBlastRadiusNodeKind('some-id', 'asset', { sub_type: 'AWS IAM Role' })).toBe('role');
    expect(inferBlastRadiusNodeKind('some-id', 'asset', { sub_type: 'AWS EC2 Instance' })).toBe(
      'instance'
    );
    expect(inferBlastRadiusNodeKind(BUCKET, 'asset', { sub_type: 'AWS Lambda Function' })).toBe(
      'bucket'
    );
  });

  it('falls back to the traversal type for ids without a recognizable pattern', () => {
    expect(inferBlastRadiusNodeKind('jdoe', 'user')).toBe('user');
    expect(inferBlastRadiusNodeKind('jdoe', 'asset')).toBe('entity');
  });
});

describe('labels', () => {
  it('shortens ARNs and EUIDs and leaves other ids alone', () => {
    expect(shortBlastRadiusLabel('arn:aws:iam::1:role/service-role/my-role')).toBe('my-role');
    expect(shortBlastRadiusLabel('host:web-1@aws')).toBe('web-1');
    expect(shortBlastRadiusLabel('plain')).toBe('plain');
  });

  it('humanizes relation names', () => {
    expect(relationLabel('grants_access_to')).toBe('grants access to');
  });
});
