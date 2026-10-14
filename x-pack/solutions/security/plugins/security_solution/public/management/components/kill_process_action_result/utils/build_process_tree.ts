/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KilledProcessDescendant } from '../../../../../common/endpoint/types';

export interface ProcessTreeNode {
  /** The process data for this PID that was provided on input */
  data: KilledProcessDescendant;
  /** Child processes, keyed by their PID. Could be an empty object if no children */
  children: ProcessTree;
}

/**
 * A tree of processes keyed by PID. Each node holds the input process `data`
 * along with any of its `children` (also keyed by PID).
 */
export interface ProcessTree {
  [pid: number]: ProcessTreeNode;
}

/**
 * Builds a tree of processes out of a flat list of processes. A process is
 * associated to its parent via its `parent_pid` property (which should match
 * the `pid` of another process in the list).
 *
 * Processes whose `parent_pid` is not present in the list (or is `undefined`)
 * are treated as roots of the tree.
 *
 * @param processes The flat list of processes to build the tree from
 */
export const buildProcessTree = (processes: KilledProcessDescendant[] = []): ProcessTree => {
  const tree: ProcessTree = {};
  // Only processes that have a PID can be placed in the tree.
  const processesWithPid = processes.filter(
    (process): process is KilledProcessDescendant & { pid: number } => process.pid !== undefined
  );

  // First pass: create a node for every process, indexed by PID, so we can
  // attach children to their parent regardless of the order in which processes
  // appear in the list.
  const nodesByPid = new Map<number, ProcessTreeNode>(
    processesWithPid.map((process) => [process.pid, { data: process, children: {} }])
  );

  // Second pass: attach each node to its parent (if present), otherwise it is
  // a root of the tree.
  for (const [pid, node] of nodesByPid) {
    const { parent_pid: parentPid } = node.data;
    const parentNode = parentPid !== undefined ? nodesByPid.get(parentPid) : undefined;

    if (parentNode && parentPid !== pid) {
      parentNode.children[pid] = node;
    } else {
      tree[pid] = node;
    }
  }

  return tree;
};
