/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a Painless script for computing the user entity ID based on a ranking system.
 *
 * The ranking system prioritizes fields in the following order:
 * 1. user.entity.id
 * 2. user.name @ host.entity.id
 * 3. user.name @ host.id
 * 4. user.name @ host.name
 * 5. user.id
 * 6. user.email
 * 7. user.name @ user.domain
 * 8. user.name
 *
 * Rules:
 * - Ignores empty or invalid values (e.g., "-", "unknown", "N/A")
 * - When composing fields (e.g., user.name @ host.id), ensures both sides are non-empty and valid
 *
 * @returns {string} A Painless script that computes the user entity ID
 */
export const generateUserEntityIdScript = (): string => {
  const script = `
    // Helper: check if field exists and has a valid (non-empty, non-placeholder) value
    boolean isValid(def doc, String field) {
      if (!doc.containsKey(field) || doc[field].empty) return false;
      String v = doc[field].value.toString().toLowerCase();
      return v != '' && v != '-' && v != 'unknown' && v != 'n/a';
    }

    // 1. user.entity.id (highest priority)
    if (isValid(doc, 'user.entity.id')) { emit(doc['user.entity.id'].value); return; }

    // 2. user.name @ host.entity.id
    if (isValid(doc, 'user.name') && isValid(doc, 'host.entity.id')) {
      emit(doc['user.name'].value + '@' + doc['host.entity.id'].value); return;
    }

    // 3. user.name @ host.id
    if (isValid(doc, 'user.name') && isValid(doc, 'host.id')) {
      emit(doc['user.name'].value + '@' + doc['host.id'].value); return;
    }

    // 4. user.name @ host.name
    if (isValid(doc, 'user.name') && isValid(doc, 'host.name')) {
      emit(doc['user.name'].value + '@' + doc['host.name'].value); return;
    }

    // 5. user.id
    if (isValid(doc, 'user.id')) { emit(doc['user.id'].value); return; }

    // 6. user.email
    if (isValid(doc, 'user.email')) { emit(doc['user.email'].value); return; }

    // 7. user.name @ user.domain
    if (isValid(doc, 'user.name') && isValid(doc, 'user.domain')) {
      emit(doc['user.name'].value + '@' + doc['user.domain'].value); return;
    }

    // 8. user.name (lowest priority)
    if (isValid(doc, 'user.name')) { emit(doc['user.name'].value); return; }

    emit('');
  `;

  // Remove leading/trailing whitespace and compress multiple spaces
  return script.trim().replace(/\n\s+/g, '\n');
};
