/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMitreReferenceUrl } from '../detection_engine/mitre/build_mitre_reference_url';
import { tacticOrder } from '../detection_engine/mitre/mitre_tactics_order';

/**
 * A MITRE node as it comes off an alert document. Every field is optional because the two fields
 * these are read from, `threat` and `kibana.alert.rule.threat`, are populated by rule authors
 * rather than validated on write.
 */
interface RawMitreNode {
  id?: string | null;
  name?: string | null;
  reference?: string | null;
}

interface RawMitreTechnique extends RawMitreNode {
  subtechnique?: RawMitreNode[] | null;
}

/** One entry of an ECS `threat` array: a tactic plus the techniques observed under it. */
export interface RawThreatBlock {
  framework?: string | null;
  tactic?: RawMitreNode | null;
  technique?: RawMitreTechnique[] | null;
}

/**
 * The threat mappings of one rule, alongside how many alerts that rule produced for the
 * detonation. Counts are per rule because that is the granularity the alert search aggregates at.
 */
export interface DetonationThreatBucket {
  alertCount: number;
  threats: RawThreatBlock[];
}

export interface MitreNodeSummary {
  id: string;
  name: string;
  /** `null` when the document carried no reference and the id does not fit the MITRE URL scheme. */
  reference: string | null;
  alertCount: number;
}

export interface MitreTechniqueSummary extends MitreNodeSummary {
  subtechniques: MitreNodeSummary[];
}

export interface MitreTacticSummary extends MitreNodeSummary {
  techniques: MitreTechniqueSummary[];
}

/**
 * Tree membership only. Counts live outside the tree, keyed by node id, because a technique that
 * sits under several tactics has to report the same figure under each of them.
 */
interface MutableNode {
  id: string;
  name: string;
  reference: string | null;
  children: Map<string, MutableNode>;
}

const resolveReference = (node: RawMitreNode, id: string): string | null =>
  node.reference ?? buildMitreReferenceUrl(id) ?? null;

/**
 * Pairs each node that has an id with that id, dropping the rest. Nodes without one cannot be
 * deduplicated, counted, or linked, so there is nothing useful to show for them.
 */
const identified = <T extends RawMitreNode>(nodes: T[] | null | undefined): Array<[string, T]> =>
  (nodes ?? []).flatMap((node) => (node?.id ? [[node.id, node] as [string, T]] : []));

/**
 * Adds a node to `into`, or returns the entry already there. The first document to name a node
 * wins, so a later one missing `name` or `reference` cannot degrade what is already resolved.
 */
const upsert = (into: Map<string, MutableNode>, id: string, node: RawMitreNode): MutableNode => {
  const existing = into.get(id);
  if (existing) {
    return existing;
  }

  const created: MutableNode = {
    id,
    name: node.name ?? id,
    reference: resolveReference(node, id),
    children: new Map(),
  };
  into.set(id, created);

  return created;
};

/** Highest count first, falling back to name so equal counts keep a stable order. */
const byAlertCount = (a: MitreNodeSummary, b: MitreNodeSummary): number =>
  b.alertCount - a.alertCount || a.name.localeCompare(b.name);

/**
 * Kill chain order, with anything outside the bundled dataset after the known tactics rather than
 * dropped, so a newer mapping still shows up.
 */
const byKillChain = (a: MitreNodeSummary, b: MitreNodeSummary): number => {
  const aIndex = tacticOrder.indexOf(a.id);
  const bIndex = tacticOrder.indexOf(b.id);

  if (aIndex === -1 && bIndex === -1) {
    return a.name.localeCompare(b.name);
  }
  if (aIndex === -1) {
    return 1;
  }
  if (bIndex === -1) {
    return -1;
  }
  return aIndex - bIndex;
};

/**
 * Folds the MITRE mappings of every rule that fired for a detonation into one tactic tree.
 *
 * Alerts carry ATT&CK in two places: `threat`, copied from the endpoint behavior rule, and
 * `kibana.alert.rule.threat`, the detection rule's own mapping. Both use the same ECS shape, so
 * the caller can pass them together and let ids do the deduplication. A technique that legitimately
 * belongs to several tactics, `T1053` for one, appears under each of them.
 *
 * Counts are per node id rather than per position in the tree, so a technique reports the same
 * figure wherever it appears. That is what makes the count usable as a pivot: the Alerts page can
 * only filter on a technique id, never on a technique underneath one particular tactic, because the
 * threat array is not a nested mapping. Counting per branch instead would advertise a smaller
 * number than the pivot goes on to show.
 */
export const mergeThreatBlocks = (buckets: DetonationThreatBucket[]): MitreTacticSummary[] => {
  const tactics = new Map<string, MutableNode>();
  const alertCounts = new Map<string, number>();

  for (const { alertCount, threats } of buckets) {
    // A rule can name the same id in more than one block. Counting it at most once per bucket stops
    // a single rule from multiplying its own alert count.
    const counted = new Set<string>();
    const countOnce = (id: string): void => {
      if (counted.has(id)) {
        return;
      }
      counted.add(id);
      alertCounts.set(id, (alertCounts.get(id) ?? 0) + alertCount);
    };

    for (const block of threats) {
      const tacticNode = block?.tactic;
      const tacticId = tacticNode?.id;

      if (tacticNode && tacticId) {
        const tactic = upsert(tactics, tacticId, tacticNode);
        countOnce(tacticId);

        for (const [techniqueId, techniqueNode] of identified(block.technique)) {
          const technique = upsert(tactic.children, techniqueId, techniqueNode);
          countOnce(techniqueId);

          for (const [subtechniqueId, subtechniqueNode] of identified(techniqueNode.subtechnique)) {
            upsert(technique.children, subtechniqueId, subtechniqueNode);
            countOnce(subtechniqueId);
          }
        }
      }
    }
  }

  const toNodeSummary = ({ id, name, reference }: MutableNode): MitreNodeSummary => ({
    id,
    name,
    reference,
    alertCount: alertCounts.get(id) ?? 0,
  });

  return [...tactics.values()]
    .map((tactic) => ({
      ...toNodeSummary(tactic),
      techniques: [...tactic.children.values()]
        .map((technique) => ({
          ...toNodeSummary(technique),
          subtechniques: [...technique.children.values()].map(toNodeSummary).sort(byAlertCount),
        }))
        .sort(byAlertCount),
    }))
    .sort(byKillChain);
};
