/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How one component relates to another on an `ontology` page. */
export const CORTEX_RELATION_KINDS = [
  'depends_on',
  'calls',
  'publishes_to',
  'reads_from',
  'runs_on',
] as const;

export type CortexRelationKind = (typeof CORTEX_RELATION_KINDS)[number];

export interface CortexRelation {
  from: string;
  to: string;
  kind: CortexRelationKind;
}

const isRelationKind = (value: string): value is CortexRelationKind =>
  (CORTEX_RELATION_KINDS as readonly string[]).includes(value);

// `source -> target : kind`, optionally as a list item. Names may contain dots, slashes and dashes.
const RELATION_LINE = /^\s*(?:[-*]\s+)?(\S.*?)\s*->\s*(\S.*?)\s*:\s*([a-z_]+)\s*$/;

/**
 * The relations an ontology page declares: one `source -> target : kind` line each, in the page's
 * `## Relations` section, normally inside a fenced block. A line that is not an edge, or whose kind is
 * unknown, is left out, so a page the optimizer wrote loosely still renders what is well formed.
 */
export const parseCortexRelations = (content: string): CortexRelation[] => {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => /^##\s+relations\b/i.test(line));
  if (start === -1) {
    return [];
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##?\s/.test(line));
  const body = end === -1 ? rest : rest.slice(0, end);

  return body.flatMap((line) => {
    const edge = RELATION_LINE.exec(line);
    if (edge === null || !isRelationKind(edge[3])) {
      return [];
    }
    return [{ from: edge[1], to: edge[2], kind: edge[3] }];
  });
};

export interface TidiedCortexOntology {
  content: string;
  /** Each line that was removed, with why. */
  dropped: Array<{ line: string; reason: 'self_edge' | 'duplicate' | 'mirrored' | 'excluded' }>;
}

const sectionRange = (lines: string[], heading: RegExp): [number, number] | undefined => {
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##?\s/.test(line));
  return [start + 1, end === -1 ? lines.length : start + 1 + end];
};

/** The kinds a telemetry store can only be related by: where a component's data goes or comes from. */
const TELEMETRY_KINDS: ReadonlySet<CortexRelationKind> = new Set(['publishes_to', 'reads_from']);

const NODE_LINE = /^\s*[-*]\s+`?([^`\s:]+)`?/;

/**
 * Removes the relation lines that make an ontology page misleading, whatever the model wrote: an
 * edge from a component to itself, a repeat of an edge, the reverse of an edge already stated with
 * the same kind (the first wins; `calls` is exempt, since two services can call each other over
 * distinct paths, and a reverse edge of another kind is a separate relation), and an edge that only
 * records where an excluded component's telemetry is stored. An excluded component, such as a telemetry integration, is not part of the
 * system's graph, so a component "publishing to" it or "reading from" it is dropped, but a
 * `depends_on`, `calls` or `runs_on` edge to it is a real dependency and stays. An excluded node is
 * dropped once no edge names it.
 */
export const tidyCortexOntology = (
  content: string,
  excluded: ReadonlySet<string> = new Set()
): TidiedCortexOntology => {
  const lines = content.split('\n');
  const dropped: TidiedCortexOntology['dropped'] = [];
  const drop = new Set<number>();

  const linked = new Set<string>();
  const relations = sectionRange(lines, /^##\s+relations\b/i);
  if (relations) {
    const seen = new Set<string>();
    for (let index = relations[0]; index < relations[1]; index++) {
      const edge = RELATION_LINE.exec(lines[index]);
      if (edge === null || !isRelationKind(edge[3])) {
        continue;
      }
      const [, from, to, kind] = edge;
      const reason: TidiedCortexOntology['dropped'][number]['reason'] | undefined =
        (excluded.has(from) || excluded.has(to)) && TELEMETRY_KINDS.has(kind)
          ? 'excluded'
          : from === to
          ? 'self_edge'
          : seen.has(`${from}\u0000${to}\u0000${kind}`)
          ? 'duplicate'
          : kind !== 'calls' && seen.has(`${to}\u0000${from}\u0000${kind}`)
          ? 'mirrored'
          : undefined;
      if (reason) {
        drop.add(index);
        dropped.push({ line: lines[index].trim(), reason });
        continue;
      }
      seen.add(`${from}\u0000${to}\u0000${kind}`);
      linked.add(from);
      linked.add(to);
    }
  }

  const nodes = sectionRange(lines, /^##\s+nodes\b/i);
  if (nodes) {
    for (let index = nodes[0]; index < nodes[1]; index++) {
      const node = NODE_LINE.exec(lines[index]);
      if (node !== null && excluded.has(node[1]) && !linked.has(node[1])) {
        drop.add(index);
        dropped.push({ line: lines[index].trim(), reason: 'excluded' });
      }
    }
  }

  return {
    content: lines.filter((_, index) => !drop.has(index)).join('\n'),
    dropped,
  };
};
