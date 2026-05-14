/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Painless script that upserts per-EUID first/last seen records into
 * `entity.relationships.<relType>.history` for an entity document.
 *
 * For each EUID in params.updates[relType]:
 *  - if a history entry already exists for that EUID, advance `last_seen` to
 *    params.collected (preserves existing `first_seen`);
 *  - otherwise append a new entry with `first_seen` and `last_seen` both set
 *    to params.collected.
 *
 * `.ids` is intentionally NOT touched here — it is managed by the entity
 * store collect_values retention on the bulkUpdateEntity write path that
 * runs before this script.
 *
 * params shape:
 * {
 *   collected: "2026-05-14T10:30:00.000Z",
 *   updates: {
 *     accesses_frequently: ["host:laptopA", "host:laptopB"],
 *     owns: ["device:1"]
 *   }
 * }
 */
export const RELATIONSHIP_HISTORY_PAINLESS_SCRIPT = `
  String collected = params.collected;
  def updates = params.updates;

  if (ctx._source.entity == null) { ctx._source.entity = [:]; }
  if (ctx._source.entity.relationships == null) { ctx._source.entity.relationships = [:]; }
  def rels = ctx._source.entity.relationships;

  for (def relEntry : updates.entrySet()) {
    String relType = relEntry.getKey();
    def euids = relEntry.getValue();

    if (rels[relType] == null) { rels[relType] = [:]; }
    if (rels[relType].history == null) { rels[relType].history = []; }
    def history = rels[relType].history;

    for (String euid : euids) {
      boolean found = false;
      for (int i = 0; i < history.size(); i++) {
        if (history[i].euid == euid) {
          history[i].last_seen = collected;
          found = true;
          break;
        }
      }
      if (!found) {
        history.add([
          'euid': euid,
          'first_seen': collected,
          'last_seen': collected
        ]);
      }
    }
  }
`;

export interface RelationshipHistoryParams {
  collected: string;
  updates: Record<string, string[]>;
}
