/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Rule ids recorded on knowledge-indicator query links, dropping blanks. */
export const ruleIdsFromQueryLinks = (links: ReadonlyArray<{ rule_id: string }>): string[] =>
  links.flatMap((link) => (link.rule_id.length > 0 ? [link.rule_id] : []));
