/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Painless script that resets entity state on the latest index using nested field access.
 * - Sets @timestamp to params.timestampNow.
 * - If entity exists: updates entity.lifecycle.last_activity (creating lifecycle if needed), clears entity.behaviors.
 */
export const HISTORY_SNAPSHOT_RESET_SCRIPT = `
ctx._source['@timestamp'] = params.timestampNow;
if (ctx._source.entity != null) {
  if (ctx._source.entity.lifecycle == null) {
    ctx._source.entity.lifecycle = new HashMap();
  }
  ctx._source.entity.lifecycle.last_activity = params.timestampNow;
  if (ctx._source.entity.behaviors != null) {
    def behaviors = ctx._source.entity.behaviors;
    def reset = new HashMap();
    for (entry in behaviors.entrySet()) {
      def key = entry.getKey();
      def value = entry.getValue();
      if (value instanceof List || value instanceof String) {
        reset.put(key, new ArrayList());
      } else if (value instanceof Boolean) {
        reset.put(key, false);
      } else {
        // don't reset other types of values
        reset.put(key, value);
      }
    }
    ctx._source.entity.behaviors = reset;
  }
}
`;
