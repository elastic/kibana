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
 * 2. user.email
 * 3. user.name @ host (when host identity available)
 * 4. user.id @ host (when host identity available)
 * 5. user.id (when no host identity)
 * 6. user.name (when no host identity)
 *
 * Host identity ranking: host.id > host.name > host.hostname > host.mac > host.ip
 *
 * @returns {string} A Painless script that computes the user entity ID
 */
export const generateUserEntityIdScript = (): string => {
  const script = `
    // Determine best host identity (per new ranking) — NO host.entity.id
    String h = null;
    if (doc.containsKey('host.id') && !doc['host.id'].empty) { h = doc['host.id'].value; }
    else if (doc.containsKey('host.name') && !doc['host.name'].empty) { h = doc['host.name'].value; }
    else if (doc.containsKey('host.hostname') && !doc['host.hostname'].empty) { h = doc['host.hostname'].value; }
    else if (doc.containsKey('host.mac') && !doc['host.mac'].empty) { h = doc['host.mac'].value; }
    else if (doc.containsKey('host.ip') && !doc['host.ip'].empty) { h = doc['host.ip'].value; }

    // Global top priority: user.entity.id, then user.email
    if (doc.containsKey('user.entity.id') && !doc['user.entity.id'].empty) { emit(doc['user.entity.id'].value); return; }
    if (doc.containsKey('user.email') && !doc['user.email'].empty) { emit(doc['user.email'].value); return; }

    // When a host identity field is available
    if (h != null) {
      // Prefer user.name @ host..., then user.id @ host...
      if (doc.containsKey('user.name') && !doc['user.name'].empty) { emit(doc['user.name'].value + '@' + h); return; }
      if (doc.containsKey('user.id') && !doc['user.id'].empty) { emit(doc['user.id'].value + '@' + h); return; }
    }

    // No host identity available (or neither user.name/id present with host): fall back to user.id, then user.name
    if (doc.containsKey('user.id') && !doc['user.id'].empty) { emit(doc['user.id'].value); return; }
    if (doc.containsKey('user.name') && !doc['user.name'].empty) { emit(doc['user.name'].value); return; }

    emit('');
  `;

  // Remove leading/trailing whitespace and compress multiple spaces
  return script.trim().replace(/\n\s+/g, '\n');
};
