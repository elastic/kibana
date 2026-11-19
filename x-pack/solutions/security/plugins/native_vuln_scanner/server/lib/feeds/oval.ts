/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SaxesParser } from 'saxes';
import { UnsupportedCriteriaError } from './errors';
import type { CvssScore } from './types';

export { UnsupportedCriteriaError };

export interface XmlNode {
  /** Local name, namespace prefix stripped (`linux-def:dpkginfo_test` -> `dpkginfo_test`). */
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export type OvalSection = 'definitions' | 'tests' | 'objects' | 'states' | 'variables';

export type OvalInput = AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>;

export interface OvalHandlers {
  /** Called once per direct child of a section, after its closing tag. */
  onItem: (section: OvalSection, node: XmlNode) => void;
  onTimestamp?: (timestamp: string) => void;
}

const SECTIONS: ReadonlySet<string> = new Set([
  'definitions',
  'tests',
  'objects',
  'states',
  'variables',
]);

// Long prose nobody matches on; dropping it keeps per-definition memory small.
const SKIPPED_TEXT: ReadonlySet<string> = new Set(['description', 'rights']);

const localName = (name: string): string => name.slice(name.indexOf(':') + 1);

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Streams an OVAL definitions document and hands each definition/test/object/state/variable to
 * `onItem` as a small tree. Only one item is materialised at a time; the event loop gets a turn
 * after every input chunk.
 */
export const readOval = async (input: OvalInput, handlers: OvalHandlers): Promise<void> => {
  const parser = new SaxesParser();
  const stack: string[] = [];
  let section: OvalSection | undefined;
  let nodes: XmlNode[] = [];
  let skipText = 0;
  let timestamp: string | undefined;

  parser.on('opentag', (tag) => {
    const name = localName(tag.name);
    stack.push(name);
    if (stack.length === 2 && SECTIONS.has(name)) {
      section = name as OvalSection;
      return;
    }
    if (stack.length === 3 && name === 'timestamp' && stack[1] === 'generator') {
      timestamp = '';
      return;
    }
    if (section === undefined || stack.length < 3) return;
    if (SKIPPED_TEXT.has(name)) skipText++;
    const node: XmlNode = {
      name,
      attrs: tag.attributes as Record<string, string>,
      children: [],
      text: '',
    };
    if (nodes.length > 0) nodes[nodes.length - 1].children.push(node);
    nodes.push(node);
  });

  const onText = (text: string): void => {
    if (timestamp !== undefined) {
      timestamp += text;
      return;
    }
    if (nodes.length > 0 && skipText === 0) nodes[nodes.length - 1].text += text;
  };
  parser.on('text', onText);
  parser.on('cdata', onText);

  parser.on('closetag', (tag) => {
    const name = localName(tag.name);
    stack.pop();
    if (timestamp !== undefined && name === 'timestamp') {
      handlers.onTimestamp?.(timestamp.trim());
      timestamp = undefined;
      return;
    }
    if (stack.length === 1 && section !== undefined && name === section) {
      section = undefined;
      return;
    }
    if (section === undefined || nodes.length === 0) return;
    if (SKIPPED_TEXT.has(name)) skipText--;
    const node = nodes.pop() as XmlNode;
    node.text = node.text.trim();
    if (nodes.length === 0) handlers.onItem(section, node);
  });

  const decoder = new TextDecoder('utf-8', { fatal: true });
  for await (const chunk of input) {
    parser.write(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
    await yieldToEventLoop();
  }
  const tail = decoder.decode();
  if (tail) parser.write(tail);
  parser.close();
  nodes = [];
};

export const child = (node: XmlNode, name: string): XmlNode | undefined =>
  node.children.find((c) => c.name === name);

export const children = (node: XmlNode, name: string): XmlNode[] =>
  node.children.filter((c) => c.name === name);

/** Depth-first search for the first descendant with the given local name. */
export const descendant = (node: XmlNode, name: string): XmlNode | undefined => {
  for (const c of node.children) {
    if (c.name === name) return c;
    const found = descendant(c, name);
    if (found) return found;
  }
  return undefined;
};

export const descendants = (node: XmlNode, name: string, out: XmlNode[] = []): XmlNode[] => {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    descendants(c, name, out);
  }
  return out;
};

/** How a feed interprets one criterion/extend_definition leaf. */
export type Atom<Leaf, Cond> =
  | { kind: 'true' }
  | { kind: 'false'; reason?: string }
  | { kind: 'condition'; condition: Cond }
  | { kind: 'leaf'; leaf: Leaf };

export interface CriteriaLeafInput {
  comment: string;
  testRef?: string;
  definitionRef?: string;
}

export type Conjunction<Leaf, Cond> = Array<
  { kind: 'condition'; condition: Cond } | { kind: 'leaf'; leaf: Leaf }
>;

const MAX_CONJUNCTIONS = 20000;

/**
 * Expands a `<criteria>` tree into disjunctive normal form over the feed's atoms. `true` atoms
 * are dropped and conjunctions holding a `false` atom are pruned, so each returned conjunction is
 * the set of facts that together make the definition true. `onFalse` sees every pruning reason.
 */
export const expandCriteria = <Leaf, Cond>(
  criteria: XmlNode,
  classify: (input: CriteriaLeafInput) => Atom<Leaf, Cond>,
  onFalse?: (reason: string) => void
): Array<Conjunction<Leaf, Cond>> => {
  const walk = (node: XmlNode): Array<Conjunction<Leaf, Cond>> => {
    if (node.attrs.negate === 'true' || node.attrs.negate === '1') {
      throw new UnsupportedCriteriaError('negated', node.attrs.comment);
    }
    if (node.name === 'criterion' || node.name === 'extend_definition') {
      const atom = classify({
        comment: node.attrs.comment ?? '',
        testRef: node.attrs.test_ref,
        definitionRef: node.attrs.definition_ref,
      });
      if (atom.kind === 'true') return [[]];
      if (atom.kind === 'false') {
        if (atom.reason) onFalse?.(atom.reason);
        return [];
      }
      return [[atom]];
    }
    if (node.name !== 'criteria') return [[]];
    const operator = node.attrs.operator ?? 'AND';
    if (operator !== 'AND' && operator !== 'OR') {
      throw new UnsupportedCriteriaError('operator', `${operator}: ${node.attrs.comment ?? ''}`);
    }
    const parts = node.children.map(walk);
    if (operator === 'OR') return parts.flat();
    // AND (the OVAL default): cartesian product of the children's disjunctions.
    let product: Array<Conjunction<Leaf, Cond>> = [[]];
    for (const part of parts) {
      if (product.length * part.length > MAX_CONJUNCTIONS) {
        throw new UnsupportedCriteriaError('too_complex');
      }
      const next: Array<Conjunction<Leaf, Cond>> = [];
      for (const left of product) for (const right of part) next.push([...left, ...right]);
      product = next;
    }
    return product;
  };
  return walk(criteria);
};

export interface GroupedLeaf<Leaf, Cond> {
  leaf: Leaf;
  /** OR of ANDs; empty when one branch reaches the leaf with no condition at all. */
  conditions: Cond[][];
}

/**
 * Collapses DNF conjunctions into one entry per leaf. Conjunctions with no leaf, or with more
 * than one, cannot become an "installed < fixed" row and are reported through `onSkip`.
 */
export const groupByLeaf = <Leaf, Cond>(
  conjunctions: Array<Conjunction<Leaf, Cond>>,
  leafKey: (leaf: Leaf) => string,
  onSkip: (reason: 'no_leaf' | 'multiple_leaves') => void
): Array<GroupedLeaf<Leaf, Cond>> => {
  const groups = new Map<string, GroupedLeaf<Leaf, Cond> & { unconditional: boolean }>();
  const seen = new Set<string>();
  for (const conjunction of conjunctions) {
    const leaves: Leaf[] = [];
    const conds: Cond[] = [];
    for (const atom of conjunction) {
      if (atom.kind === 'leaf') leaves.push(atom.leaf);
      else conds.push(atom.condition);
    }
    if (leaves.length !== 1) {
      onSkip(leaves.length === 0 ? 'no_leaf' : 'multiple_leaves');
      continue;
    }
    const key = leafKey(leaves[0]);
    const unique = [...new Map(conds.map((c) => [JSON.stringify(c), c])).values()];
    const dedupeKey = `${key}\u0000${unique
      .map((c) => JSON.stringify(c))
      .sort()
      .join('\u0000')}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    let group = groups.get(key);
    if (!group) {
      group = { leaf: leaves[0], conditions: [], unconditional: false };
      groups.set(key, group);
    }
    if (unique.length === 0) group.unconditional = true;
    else group.conditions.push(unique);
  }
  return [...groups.values()].map(({ leaf, conditions, unconditional }) => ({
    leaf,
    conditions: unconditional ? [] : conditions,
  }));
};

/** `20230124` or `20230124:1000` (OVAL `public` attribute) -> ISO 8601 UTC. */
export const ovalPublicToIso = (value: string | undefined): string | undefined => {
  const m = value?.match(/^(\d{4})(\d{2})(\d{2})(?::(\d{2})(\d{2}))?$/);
  if (!m) return undefined;
  const [, y, mo, d, h = '00', mi = '00'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:00Z`;
};

/** OVAL generator timestamps carry no zone; both vendors publish them in UTC. */
export const ovalTimestampToIso = (value: string | undefined): string | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return undefined;
  return /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
};

/** `"7.0/CVSS:3.1/AV:..."` (Red Hat) or score + vector (Ubuntu) -> structured score. */
export const parseCvss = (
  score: string | undefined,
  vector: string | undefined,
  fallbackVersion: string
): CvssScore | undefined => {
  const n = score === undefined || score.trim() === '' ? NaN : Number(score);
  if (!Number.isFinite(n) || !vector) return undefined;
  const version = vector.match(/^CVSS:(\d+(?:\.\d+)?)\//)?.[1] ?? fallbackVersion;
  return { version, score: n, vector };
};

export const parseSlashCvss = (
  value: string | undefined,
  fallbackVersion: string
): CvssScore | undefined => {
  if (!value) return undefined;
  const slash = value.indexOf('/');
  if (slash < 0) return undefined;
  return parseCvss(value.slice(0, slash), value.slice(slash + 1), fallbackVersion);
};

export const countInto = (counts: Record<string, number>, key: string, by = 1): void => {
  counts[key] = (counts[key] ?? 0) + by;
};
