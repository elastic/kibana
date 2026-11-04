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
