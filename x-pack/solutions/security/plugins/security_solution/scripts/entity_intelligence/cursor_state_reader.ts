/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatabaseSync } from 'node:sqlite';
import type { CursorBubble, CursorComposer, CursorHeader } from './cursor_session_parser';

export interface CursorSessionSnapshot {
  header: CursorHeader;
  composer: CursorComposer;
  bubbles: CursorBubble[];
  complete: boolean;
}
export interface CursorReadResult {
  sessions: CursorSessionSnapshot[];
  unavailableRecords: number;
  bounded: boolean;
}

/** Reads only Cursor conversation tables through a read-only SQLite connection and bounded row projections. */
export const readCursorState = (
  path: string,
  cutoff: number,
  maxSessions = 100,
  maxBubbles = 10000
): CursorReadResult => {
  const database = new DatabaseSync(path, { readOnly: true, timeout: 2000 });
  const sessions: CursorSessionSnapshot[] = [];
  let unavailableRecords = 0;
  let bytesRead = 0;
  let bounded = false;
  const boundedText = (value?: string): string | undefined =>
    typeof value === 'string' ? value.slice(0, 256001) : undefined;
  try {
    database.exec('PRAGMA query_only = ON');
    database.exec('BEGIN');
    const rows = database
      .prepare(
        'SELECT composerId, createdAt, lastUpdatedAt, isSubagent, CASE WHEN length(value) <= 1048576 THEN value ELSE NULL END AS value FROM composerHeaders WHERE lastUpdatedAt >= ? ORDER BY lastUpdatedAt DESC LIMIT ?'
      )
      .all(cutoff, maxSessions + 1);
    const getRecord = database.prepare(
      'SELECT CASE WHEN length(value) <= 8388608 THEN value ELSE NULL END AS value FROM cursorDiskKV WHERE key = ?'
    );
    for (const row of rows.slice(0, maxSessions)) {
      if (bytesRead >= 256 * 1024 * 1024) {
        bounded = true;
        break;
      }
      try {
        if (
          typeof row.composerId !== 'string' ||
          typeof row.value !== 'string' ||
          (row.createdAt !== null &&
            (typeof row.createdAt !== 'number' || !Number.isFinite(row.createdAt)))
        ) {
          unavailableRecords++;
        } else {
          const header: CursorHeader = JSON.parse(row.value);
          if (!header.isDraft && header.composerId === row.composerId) {
            const record = getRecord.get(`composerData:${row.composerId}`);
            if (
              !record ||
              (typeof record.value !== 'string' && !(record.value instanceof Uint8Array))
            ) {
              unavailableRecords++;
            } else {
              const composer: CursorComposer = JSON.parse(
                typeof record.value === 'string'
                  ? record.value
                  : Buffer.from(record.value).toString('utf8')
              );
              const headers = Array.isArray(composer.fullConversationHeadersOnly)
                ? composer.fullConversationHeadersOnly
                : [];
              let complete = headers.length <= maxBubbles;
              const bubbles: CursorBubble[] = [];
              for (const bubbleHeader of headers.slice(-maxBubbles)) {
                if (bytesRead >= 256 * 1024 * 1024) {
                  bounded = true;
                  complete = false;
                  break;
                }
                if (
                  typeof bubbleHeader.bubbleId !== 'string' ||
                  !/^[a-zA-Z0-9_-]{1,128}$/.test(bubbleHeader.bubbleId)
                ) {
                  complete = false;
                } else {
                  const bubbleRecord = getRecord.get(
                    `bubbleId:${row.composerId}:${bubbleHeader.bubbleId}`
                  );
                  if (
                    !bubbleRecord ||
                    (typeof bubbleRecord.value !== 'string' &&
                      !(bubbleRecord.value instanceof Uint8Array))
                  ) {
                    complete = false;
                    unavailableRecords++;
                  } else {
                    bytesRead += bubbleRecord.value.length;
                    const bubble: CursorBubble = JSON.parse(
                      typeof bubbleRecord.value === 'string'
                        ? bubbleRecord.value
                        : Buffer.from(bubbleRecord.value).toString('utf8')
                    );
                    if (bubble.bubbleId !== bubbleHeader.bubbleId) complete = false;
                    else
                      bubbles.push({
                        bubbleId: bubble.bubbleId,
                        type: bubble.type,
                        createdAt: bubble.createdAt,
                        text: bubble.type === 1 ? boundedText(bubble.text) : undefined,
                        modelInfo: bubble.modelInfo
                          ? { modelName: bubble.modelInfo.modelName }
                          : undefined,
                        toolFormerData: bubble.toolFormerData
                          ? {
                              name: bubble.toolFormerData.name,
                              toolCallId: bubble.toolFormerData.toolCallId,
                              status: bubble.toolFormerData.status,
                              rawArgs: boundedText(bubble.toolFormerData.rawArgs),
                              params: boundedText(bubble.toolFormerData.params),
                              result: boundedText(bubble.toolFormerData.result),
                            }
                          : undefined,
                      });
                  }
                }
              }
              sessions.push({
                header: {
                  ...header,
                  createdAt: row.createdAt ?? undefined,
                  isSubagent: row.isSubagent === 1,
                },
                composer,
                bubbles,
                complete,
              });
            }
          }
        }
      } catch {
        unavailableRecords++;
      }
    }
    return { sessions, unavailableRecords, bounded: bounded || rows.length > maxSessions };
  } finally {
    database.close();
  }
};
