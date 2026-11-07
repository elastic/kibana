/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { GraphEntityKind } from './graph_state';
import type { AlertSeverity } from './hooks/use_entity_relationships';
import type { TimelineStep } from './timeline_model';

/** Builds correlated activity from observed entities, alert tactics, and event context. */

const SEVERITY_RANK: Record<AlertSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Kill-chain stages we group the spine by, in canonical left→right order. */
export type KillChainStage =
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-and-control'
  | 'exfiltration'
  | 'impact';

export const KILL_CHAIN_ORDER: readonly KillChainStage[] = [
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

/** Maps a MITRE tactic name (as stored on alerts) to a kill-chain stage. */
export const tacticToStage = (tactic: string | undefined): KillChainStage | undefined => {
  if (!tactic) return undefined;
  const normalized = tactic.trim().toLowerCase();
  switch (normalized) {
    case 'initial access':
      return 'initial-access';
    case 'execution':
      return 'execution';
    case 'persistence':
      return 'persistence';
    case 'privilege escalation':
      return 'privilege-escalation';
    case 'defense evasion':
      return 'defense-evasion';
    case 'credential access':
      return 'credential-access';
    case 'discovery':
      return 'discovery';
    case 'lateral movement':
      return 'lateral-movement';
    case 'collection':
      return 'collection';
    case 'command and control':
      return 'command-and-control';
    case 'exfiltration':
      return 'exfiltration';
    case 'impact':
      return 'impact';
    default:
      return undefined;
  }
};

const stageOrdinal = (stage: KillChainStage): number => KILL_CHAIN_ORDER.indexOf(stage);

/** Category of a grounded finding annotation, color-coded in the view. */
export type AnnotationKind = 'alert' | 'activity' | 'config';

/** A grounded callout attached to a spine node (above/below the spine). */
export interface PathAnnotation {
  id: string;
  /** Spine node id this annotation is anchored to. */
  nodeId: string;
  kind: AnnotationKind;
  /** Short human sentence, grounded in real evidence. */
  text: string;
  severity: AlertSeverity | undefined;
  /** Render above (true) or below (false) the spine, alternated for density. */
  above: boolean;
}

/** A sensitive resource branching off a spine node (Wiz "crown jewel"). */
export type CrownJewelKind = 'sensitive-host' | 'data-store' | 'exfil-destination';

export interface CrownJewelLeaf {
  id: string;
  /** Spine node id this leaf branches from. */
  nodeId: string;
  name: string;
  kind: CrownJewelKind;
  /** Honest, grounded reason this is flagged sensitive. */
  reason: string;
  severity: AlertSeverity | undefined;
  /** Name of the spine entity that reached this resource (for the detail view). */
  reachedFrom: string;
  /** Number of alerts on the parent entity linking to this resource. */
  alertCount: number;
}

/** One node on the horizontal spine. */
export interface SpineNode {
  id: string;
  name: string;
  kind: GraphEntityKind | 'origin';
  /** Raw identifier for downstream queries / focus wiring. */
  identifierValue: string;
  alertCount: number;
  worstSeverity: AlertSeverity | undefined;
  /** Kill-chain stage this node belongs to (undefined for the origin). */
  stage: KillChainStage | undefined;
  /** Short activity phrase describing how the attacker moved *to* this node. */
  transition: string | undefined;
}

/** A contiguous band of spine nodes sharing a kill-chain stage. */
export interface StageBand {
  stage: KillChainStage;
  label: string;
  /** Spine node ids covered by this band, in order. */
  nodeIds: readonly string[];
}

export interface AttackPath {
  spine: readonly SpineNode[];
  stages: readonly StageBand[];
  annotations: readonly PathAnnotation[];
  crownJewels: readonly CrownJewelLeaf[];
  /**
   * True when there is not enough correlated activity to tell an attack story
   * (view shows the focus + direct neighbors as a minimal path, or an empty
   * state).
   */
  isSparse: boolean;
}

/** Neighbor of the focus entity, as produced by `useEntityRelationships`. */
export interface AttackPathNeighbor {
  id: string;
  name: string;
  kind: GraphEntityKind;
  alertCount: number;
  worstSeverity: AlertSeverity | undefined;
  /** Dominant event-context phrase, e.g. "spawned process bash". */
  activity: string | undefined;
  /** Asset criticality from the entity store, when known. */
  criticality: string | undefined;
  /** Concrete outbound destination the focus reached via this neighbor (ip). */
  destinationIp: string | undefined;
}

export interface AttackPathFocus {
  name: string;
  kind: GraphEntityKind;
  identifierValue: string;
  worstSeverity: AlertSeverity | undefined;
  alertCount: number;
  criticality: string | undefined;
}

export interface BuildAttackPathInput {
  focus: AttackPathFocus;
  neighbors: readonly AttackPathNeighbor[];
  /** Significant timeline steps for the focus, for tactic ordering + annotations. */
  steps: readonly TimelineStep[];
  /** Localized stage labels (injected so the model stays i18n-agnostic). */
  stageLabels: Record<KillChainStage, string>;
  /** Localized origin node name (e.g. "Internet"). */
  originLabel: string;
  /**
   * Grounded external-entry signal. The Internet/external origin node is ONLY
   * prepended when this is present (e.g. a real public inbound `source.ip` was
   * observed reaching the focus, or an external-facing initial-access alert).
   * When absent, the spine starts at the real first entity.
   */
  externalEntry?: AttackPathExternalEntry;
  /** Max spine nodes (excluding origin) placed before overflow. */
  spineLimit?: number;
}

/** Observed inbound traffic from a public address; this alone does not establish initial access. */
export interface AttackPathExternalEntry {
  /** Public inbound source IP observed reaching the focus. */
  sourceIp: string;
  /** How many inbound flows/alerts came from it (for the origin detail). */
  count: number;
}

const DEFAULT_SPINE_LIMIT = 6;

/** Criticality values (entity store) that mark a host as a crown jewel. */
const SENSITIVE_CRITICALITY = new Set(['high_impact', 'extreme_impact']);

const isPublicIpv4 = (ip: string): boolean => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const octets = ip.split('.').map(Number);
  if (octets.some((part) => part > 255)) return false;
  const [first, second] = octets;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127)
  );
};

/** Returns an observed alert tactic only when the alert identifies this entity's type and name. */
const observedStageFromSteps = (
  steps: readonly TimelineStep[],
  kind: GraphEntityKind,
  identifier: string
): KillChainStage | undefined => {
  let earliest: KillChainStage | undefined;
  for (const step of steps) {
    const matches =
      kind === EntityType.host
        ? step.host === identifier
        : kind === EntityType.user
        ? step.user === identifier
        : false;
    if (matches && step.kind === 'alert') {
      const stage = tacticToStage(step.tacticName);
      if (stage && (earliest === undefined || stageOrdinal(stage) < stageOrdinal(earliest))) {
        earliest = stage;
      }
    }
  }
  return earliest;
};

/**
 * Orders neighbors into spine position. Neighbors are ranked by shared-alert
 * strength (desc), then worst severity, then name — so the strongest correlated
 * pivots form the trunk of the path. IPs sort last unless they are the sole
 * link. Deterministic.
 */
const orderNeighbors = (neighbors: readonly AttackPathNeighbor[]): AttackPathNeighbor[] =>
  [...neighbors].sort((a, b) => {
    if (a.alertCount !== b.alertCount) return b.alertCount - a.alertCount;
    const sevA = a.worstSeverity ? SEVERITY_RANK[a.worstSeverity] : -1;
    const sevB = b.worstSeverity ? SEVERITY_RANK[b.worstSeverity] : -1;
    if (sevA !== sevB) return sevB - sevA;
    return a.name.localeCompare(b.name);
  });

/** Derives resources only from explicit criticality or an observed public destination. */
const deriveCrownJewels = (
  focus: AttackPathFocus,
  spine: readonly SpineNode[],
  neighbors: readonly AttackPathNeighbor[]
): CrownJewelLeaf[] => {
  const leaves: CrownJewelLeaf[] = [];
  const neighborById = new Map(neighbors.map((n) => [n.id, n]));

  for (const node of spine) {
    if (node.kind !== 'origin') {
      const neighbor = neighborById.get(node.id);
      const criticality =
        node.id === focusSpineId(focus) ? focus.criticality : neighbor?.criticality;

      if (criticality && SENSITIVE_CRITICALITY.has(criticality)) {
        leaves.push({
          id: `jewel:crit:${node.id}`,
          nodeId: node.id,
          name: node.name,
          kind: 'sensitive-host',
          reason: `Asset criticality: ${criticality.replace(/_/g, ' ')}`,
          severity: node.worstSeverity,
          reachedFrom: node.name,
          alertCount: node.alertCount,
        });
      }

      // Concrete outbound exfil destination the focus reached via this neighbor.
      if (neighbor?.destinationIp && isPublicIpv4(neighbor.destinationIp)) {
        leaves.push({
          id: `jewel:exfil:${node.id}:${neighbor.destinationIp}`,
          nodeId: node.id,
          name: neighbor.destinationIp,
          kind: 'exfil-destination',
          reason: 'Observed connection to an external destination',
          severity: node.worstSeverity,
          reachedFrom: node.name,
          alertCount: node.alertCount,
        });
      }
    }
  }

  return leaves;
};

const focusSpineId = (focus: AttackPathFocus): string => `${focus.kind}:${focus.identifierValue}`;

/**
 * Builds grounded finding annotations from the timeline steps: alert steps
 * become `alert` callouts (rule name), significant events become `activity`
 * callouts (their phrase). Anchored to the spine node matching the step's
 * host/user; alternated above/below for readability. Only real steps are used.
 */
const deriveAnnotations = (
  steps: readonly TimelineStep[],
  spine: readonly SpineNode[],
  limit: number
): PathAnnotation[] => {
  const spineByIdentifier = new Map<string, SpineNode>();
  for (const node of spine) {
    if (node.kind !== 'origin') spineByIdentifier.set(`${node.kind}:${node.identifierValue}`, node);
  }
  const annotations: PathAnnotation[] = [];
  let above = true;
  for (const step of steps) {
    if (annotations.length < limit) {
      const anchor =
        (step.host && spineByIdentifier.get(`${EntityType.host}:${step.host}`)) ||
        (step.user && spineByIdentifier.get(`${EntityType.user}:${step.user}`));
      if (anchor) {
        annotations.push({
          id: `annotation:${step.id}`,
          nodeId: anchor.id,
          kind: step.kind === 'alert' ? 'alert' : 'activity',
          text: step.kind === 'alert' ? step.alertRuleName ?? step.label : step.label,
          severity: step.severity,
          above,
        });
        above = !above;
      }
    }
  }
  return annotations;
};

const stageLabelOf = (stage: KillChainStage, labels: Record<KillChainStage, string>): string =>
  labels[stage];

/**
 * Groups the ordered spine (excluding origin) into contiguous stage bands so
 * the view can label kill-chain segments above the spine.
 */
const deriveStageBands = (
  spine: readonly SpineNode[],
  labels: Record<KillChainStage, string>
): StageBand[] => {
  const bands: StageBand[] = [];
  for (const node of spine) {
    if (node.kind !== 'origin' && node.stage !== undefined) {
      const last = bands[bands.length - 1];
      if (last && last.stage === node.stage) {
        bands[bands.length - 1] = { ...last, nodeIds: [...last.nodeIds, node.id] };
      } else {
        bands.push({
          stage: node.stage,
          label: stageLabelOf(node.stage, labels),
          nodeIds: [node.id],
        });
      }
    }
  }
  return bands;
};

/** Builds an evidence-backed focus entity and its correlated neighbors without inferring progression. */
export const buildAttackPath = (input: BuildAttackPathInput): AttackPath => {
  const { focus, neighbors, steps, stageLabels, originLabel, externalEntry } = input;
  const spineLimit = input.spineLimit ?? DEFAULT_SPINE_LIMIT;

  const focusStage = observedStageFromSteps(steps, focus.kind, focus.identifierValue);
  const orderedNeighbors = orderNeighbors(neighbors).slice(0, spineLimit);

  // The external/Internet origin is ONLY present when there is real evidence
  // the chain began externally (a public inbound source IP reaching the focus).
  // Otherwise the spine starts at the real first entity — no synthesized node.
  const origin: SpineNode | undefined = externalEntry
    ? {
        id: 'origin',
        name: originLabel,
        kind: 'origin',
        identifierValue: externalEntry.sourceIp,
        alertCount: externalEntry.count,
        worstSeverity: undefined,
        stage: undefined,
        transition: undefined,
      }
    : undefined;

  const focusNode: SpineNode = {
    id: focusSpineId(focus),
    name: focus.name,
    kind: focus.kind,
    identifierValue: focus.identifierValue,
    alertCount: focus.alertCount,
    worstSeverity: focus.worstSeverity,
    stage: focusStage,
    transition: undefined,
  };

  const neighborNodes: SpineNode[] = orderedNeighbors.map((neighbor) => ({
    id: neighbor.id,
    name: neighbor.name,
    kind: neighbor.kind,
    identifierValue: neighbor.name,
    alertCount: neighbor.alertCount,
    worstSeverity: neighbor.worstSeverity,
    stage: observedStageFromSteps(steps, neighbor.kind, neighbor.name),
    transition: neighbor.activity,
  }));

  const spine: SpineNode[] = [...(origin ? [origin] : []), focusNode, ...neighborNodes];
  const stages = deriveStageBands(spine, stageLabels);
  const annotations = deriveAnnotations(steps, spine, spineLimit + 3);
  const crownJewels = deriveCrownJewels(focus, spine, neighbors);

  // Sparse: no correlated neighbors and no findings (just the focus, maybe origin).
  const isSparse = neighborNodes.length === 0 && annotations.length === 0;

  return { spine, stages, annotations, crownJewels, isSparse };
};

/** The result of computing focus-mode highlight/dim sets for a selection. */
export interface FocusSet {
  /** Node ids on the selected node's path (kept bright). */
  highlighted: ReadonlySet<string>;
  /** Node ids not on the path (dimmed). Empty when nothing is selected. */
  dimmed: ReadonlySet<string>;
}

/** Highlights the selected evidence and its focus connection without implying a chain through other neighbors. */
export const computeFocusSet = (
  spine: readonly SpineNode[],
  crownJewels: readonly CrownJewelLeaf[],
  selectedId: string | undefined
): FocusSet => {
  if (!selectedId) {
    return { highlighted: new Set(), dimmed: new Set() };
  }
  const selectedIndex = spine.findIndex((node) => node.id === selectedId);
  const highlighted = new Set<string>();
  const dimmed = new Set<string>();

  // A leaf selection highlights its parent path; resolve to the parent index.
  const selectedLeaf = crownJewels.find((leaf) => leaf.id === selectedId);
  const anchorIndex = selectedLeaf
    ? spine.findIndex((node) => node.id === selectedLeaf.nodeId)
    : selectedIndex;

  if (anchorIndex < 0) {
    // Unknown selection — highlight nothing, dim nothing.
    return { highlighted: new Set(), dimmed: new Set() };
  }

  const focusIndex = spine.findIndex((node) => node.kind !== 'origin');
  spine.forEach((node, index) => {
    if (
      index === anchorIndex ||
      (anchorIndex >= focusIndex && (index === focusIndex || node.kind === 'origin'))
    ) {
      highlighted.add(node.id);
    } else {
      dimmed.add(node.id);
    }
  });
  if (selectedLeaf) highlighted.add(selectedLeaf.id);

  for (const leaf of crownJewels) {
    if (highlighted.has(leaf.nodeId) && leaf.id !== selectedLeaf?.id) {
      // Leaves of highlighted nodes stay bright; leaves of dimmed nodes dim.
      highlighted.add(leaf.id);
    } else if (!highlighted.has(leaf.id)) {
      dimmed.add(leaf.id);
    }
  }

  return { highlighted, dimmed };
};
