/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a Painless script for computing the host entity ID based on a ranking system.
 *
 * The ranking system prioritizes fields in the following order:
 * 1. host.entity.id
 * 2. host.id
 * 3. host.name . host.domain
 * 4. host.hostname . host.domain
 * 5. host.hostname
 * 6. host.name
 *
 * Rules:
 * - Ignores empty or invalid values (e.g., "-", "unknown", "N/A")
 * - When composing fields (e.g., host.name . host.domain), ensures both sides are non-empty and valid
 *
 * @returns {string} A Painless script that computes the host entity ID
 */
export const generateHostEntityIdScript = (): string => {
  const script = `
    // Helper: check if field exists and has a valid (non-empty, non-placeholder) value
    boolean isValid(def doc, String field) {
      if (!doc.containsKey(field) || doc[field].empty) return false;
      String v = doc[field].value.toString().toLowerCase();
      return v != '' && v != '-' && v != 'unknown' && v != 'n/a';
    }

    // 1. host.entity.id (highest priority)
    if (isValid(doc, 'host.entity.id')) { emit(doc['host.entity.id'].value); return; }

    // 2. host.id
    if (isValid(doc, 'host.id')) { emit(doc['host.id'].value); return; }

    // 3. host.name . host.domain
    if (isValid(doc, 'host.name') && isValid(doc, 'host.domain')) {
      emit(doc['host.name'].value + '.' + doc['host.domain'].value); return;
    }

    // 4. host.hostname . host.domain
    if (isValid(doc, 'host.hostname') && isValid(doc, 'host.domain')) {
      emit(doc['host.hostname'].value + '.' + doc['host.domain'].value); return;
    }

    // 5. host.hostname
    if (isValid(doc, 'host.hostname')) { emit(doc['host.hostname'].value); return; }

    // 6. host.name (lowest priority)
    if (isValid(doc, 'host.name')) { emit(doc['host.name'].value); return; }

    emit('');
  `;

  // Remove leading/trailing whitespace and compress multiple spaces
  return script.trim().replace(/\n\s+/g, '\n');
};
