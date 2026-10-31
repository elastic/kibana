/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EdgeViewModel,
  EntityNodeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import { i18n } from '@kbn/i18n';
import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import type {
  GraphTraversalEntity,
  GraphTraversalNode,
  GraphTraversalOutput,
} from '@kbn/entity-store/common';

export type BlastRadiusNodeKind =
  | 'user'
  | 'role'
  | 'policy'
  | 'instance'
  | 'bucket'
  | 'host'
  | 'service'
  | 'entity';

export interface BlastRadiusGraph {
  nodes: NodeViewModel[];
  edges: EdgeViewModel[];
}

export interface BuildBlastRadiusGraphOptions {
  /** When given, every node but the seed offers an "Exclude" action calling this with its id. */
  onExcludeNode?: (nodeId: string) => void;
}

type NodeToolbarItems = ReturnType<NonNullable<EntityNodeViewModel['toolbarItemsFn']>>;

const EXCLUDE_NODE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.blastRadius.excludeNode',
  { defaultMessage: 'Exclude from blast radius' }
);

export const EXCLUDE_NODE_TEST_SUBJECT = 'blastRadiusExcludeNode';

interface NodePresentation {
  shape: EntityNodeViewModel['shape'];
  icon: string;
  tag: string;
}

const PRESENTATION: Record<BlastRadiusNodeKind, NodePresentation> = {
  user: { shape: 'ellipse', icon: 'user', tag: 'User' },
  role: { shape: 'pentagon', icon: 'key', tag: 'IAM role' },
  policy: { shape: 'pentagon', icon: 'document', tag: 'IAM policy' },
  instance: { shape: 'hexagon', icon: 'compute', tag: 'EC2 instance' },
  bucket: { shape: 'rectangle', icon: 'storage', tag: 'S3 bucket' },
  host: { shape: 'hexagon', icon: 'storage', tag: 'Host' },
  service: { shape: 'rectangle', icon: 'node', tag: 'Service' },
  entity: { shape: 'hexagon', icon: 'globe', tag: 'Asset' },
};

/**
 * The traversal types nodes only coarsely (user, role, asset). When the entity store resolved
 * the node its engine type and sub type decide; otherwise the kind is read off the id itself:
 * AWS ARNs name their resource type, entity store EUIDs carry a type prefix.
 */
export const inferBlastRadiusNodeKind = (
  id: string,
  type?: string,
  entity?: GraphTraversalEntity
): BlastRadiusNodeKind => {
  const fromEntity = kindFromEntity(entity);
  if (fromEntity) return fromEntity;
  if (id.startsWith('arn:aws:iam:') && id.includes(':role/')) return 'role';
  if (id.startsWith('arn:aws:iam:') && id.includes(':policy/')) return 'policy';
  if (id.startsWith('arn:aws:ec2:') && id.includes(':instance/')) return 'instance';
  if (id.startsWith('arn:aws:s3:::')) return 'bucket';
  if (id.startsWith('user:')) return 'user';
  if (id.startsWith('host:')) return 'host';
  if (id.startsWith('service:')) return 'service';
  if (type === 'user' || type === 'role' || type === 'host' || type === 'service') return type;
  return 'entity';
};

const kindFromEntity = (entity?: GraphTraversalEntity): BlastRadiusNodeKind | undefined => {
  if (!entity) return undefined;
  if (
    entity.engine_type === 'user' ||
    entity.engine_type === 'host' ||
    entity.engine_type === 'service'
  ) {
    return entity.engine_type;
  }
  const subType = entity.sub_type?.toLowerCase() ?? '';
  if (subType.endsWith(' role')) return 'role';
  if (subType.endsWith(' policy')) return 'policy';
  if (subType.endsWith(' instance')) return 'instance';
  if (subType.endsWith(' bucket')) return 'bucket';
  return undefined;
};

/**
 * A short display name: the resource name of an ARN, the identifier of an EUID.
 */
export const shortBlastRadiusLabel = (id: string): string => {
  if (id.startsWith('arn:aws:s3:::')) return id.slice('arn:aws:s3:::'.length);
  if (id.startsWith('arn:')) {
    const resource = id.split(':').slice(5).join(':');
    const name = resource.split('/').pop();
    return name && name.length > 0 ? name : id;
  }
  const euid = id.match(/^(user|host|service):(.+)@[^@]+$/);
  if (euid) return euid[2];
  return id;
};

/** `grants_access_to` -> `grants access to`. */
export const relationLabel = (relation: string): string => relation.replace(/_/g, ' ');

const labelNodeId = (edge: { hop: number; relation: string; source: string; target: string }) =>
  `label:${edge.hop}:${edge.relation}:${edge.source}->${edge.target}`;

/**
 * Map the traversal workflow output onto the graph package's view models: one entity node per
 * traversed node, and for each traversed edge a label node carrying the relation, wired as
 * source -> label -> target so the relation renders between the two entities. The seed is
 * marked as the compromised origin.
 */
export const buildBlastRadiusGraph = (
  output: GraphTraversalOutput,
  { onExcludeNode }: BuildBlastRadiusGraphOptions = {}
): BlastRadiusGraph => {
  const entityNodes: EntityNodeViewModel[] = [];
  const seen = new Set<string>();

  for (const node of output.nodes) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      entityNodes.push(toEntityNode(node, node.id === output.seed_id, onExcludeNode));
    }
  }
  const nodes: NodeViewModel[] = [...disambiguateLabels(entityNodes)];

  const edges: EdgeViewModel[] = [];
  const seenEdges = new Set<string>();
  for (const edge of output.edges) {
    const id = labelNodeId(edge);
    const admitted = seen.has(edge.source) && seen.has(edge.target);
    if (admitted && !seenEdges.has(id)) {
      seenEdges.add(id);
      const labelNode: LabelNodeViewModel = {
        id,
        shape: 'label',
        label: relationLabel(edge.relation),
        color: 'primary',
        count: edge.count,
        interactive: true,
      };
      nodes.push(labelNode);
      edges.push(
        { id: `${edge.source}->${id}`, source: edge.source, target: id, color: 'primary' },
        { id: `${id}->${edge.target}`, source: id, target: edge.target, color: 'primary' }
      );
    }
  }

  return { nodes, edges };
};

/**
 * A resolved node carries the stored entity as its document, so the node card shows the
 * store's name, sub type, sources and criticality and the badge logic treats it as an entity.
 */
const toEntityNode = (
  node: GraphTraversalNode,
  isSeed: boolean,
  onExcludeNode?: (nodeId: string) => void
): EntityNodeViewModel => {
  const { id, type, entity, resolved } = node;
  const kind = inferBlastRadiusNodeKind(id, type, entity);
  const base: EntityNodeViewModel = {
    id,
    label: entity?.name ?? shortBlastRadiusLabel(id),
    color: isSeed ? 'danger' : 'primary',
    shape: PRESENTATION[kind].shape,
    icon: PRESENTATION[kind].icon,
    tag: entity?.sub_type ?? PRESENTATION[kind].tag,
    interactive: true,
    ...(onExcludeNode &&
      !isSeed && {
        toolbarItemsFn: (): NodeToolbarItems => [
          {
            iconType: 'eyeClosed',
            label: EXCLUDE_NODE_LABEL,
            onClick: () => onExcludeNode(id),
            testSubject: EXCLUDE_NODE_TEST_SUBJECT,
          },
        ],
      }),
  };
  if (!resolved || !entity) {
    return base;
  }
  const document: NodeDocumentDataModel = {
    id: node.euid ?? id,
    type: DOCUMENT_TYPE_ENTITY,
    entity: {
      availableInEntityStore: true,
      ...(entity.name !== undefined && { name: entity.name }),
      ...(entity.type !== undefined && { type: entity.type }),
      ...(entity.sub_type !== undefined && { sub_type: entity.sub_type }),
      ...(entity.engine_type !== undefined && { engine_type: entity.engine_type }),
      ...(entity.sources !== undefined && { sources: entity.sources }),
      ...(entity.criticality !== undefined && { assetCriticality: entity.criticality }),
      ...(entity.risk_score !== undefined && { riskScore: entity.risk_score }),
    },
  };
  return {
    ...base,
    documentsData: [document],
    ...(entity.criticality !== undefined && {
      assetCriticality: [{ level: entity.criticality, count: 1 }],
    }),
    ...(entity.risk_score !== undefined && {
      riskScore: { min: entity.risk_score, max: entity.risk_score },
    }),
  };
};

/**
 * Nodes that share a label (the same role name in several AWS accounts, say) get a
 * qualifier so they can be told apart: the account of an ARN, otherwise the full id.
 */
const disambiguateLabels = (nodes: EntityNodeViewModel[]): EntityNodeViewModel[] => {
  const occurrences = new Map<string, number>();
  for (const node of nodes) {
    const label = String(node.label);
    occurrences.set(label, (occurrences.get(label) ?? 0) + 1);
  }
  return nodes.map((node) =>
    (occurrences.get(String(node.label)) ?? 0) > 1
      ? { ...node, label: `${node.label} (${labelQualifier(node.id)})` }
      : node
  );
};

const labelQualifier = (id: string): string => {
  if (id.startsWith('arn:')) {
    const [, , , , account] = id.split(':');
    if (account) return account;
  }
  return id;
};
