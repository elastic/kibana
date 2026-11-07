/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatabaseSync } from 'node:sqlite';

/** Reads recorded titles for selected sessions without opening other conversation fields. */
export const loadCodexTitles = (path: string, sessionIds: string[]): Map<string, string> => {
  if (!sessionIds.length) return new Map();
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(path, { readOnly: true });
    const rows = database
      .prepare(`SELECT id, title FROM threads WHERE id IN (${sessionIds.map(() => '?').join(',')})`)
      .all(...sessionIds);
    return new Map(
      rows.flatMap((row) =>
        typeof row.id === 'string' && typeof row.title === 'string' && row.title.trim()
          ? [[row.id, row.title] as const]
          : []
      )
    );
  } catch {
    return new Map();
  } finally {
    database?.close();
  }
};
