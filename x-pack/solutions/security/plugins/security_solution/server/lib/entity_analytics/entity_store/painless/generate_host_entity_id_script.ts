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
 * 2. (host.name|host.hostname) | host.id
 * 3. (host.name|host.hostname) | host.mac
 * 4. host.name | host.ip
 * 5. host.hostname | host.ip
 * 6. host.id
 * 7. host.mac
 * 8. host.name
 * 9. host.hostname
 * 10. host.ip
 *
 * @returns {string} A Painless script that computes the host entity ID
 */
export const generateHostEntityIdScript = (): string => {
  const script = `
    String label = null;
    if (doc.containsKey('host.name') && !doc['host.name'].empty) { label = doc['host.name'].value; }
    else if (doc.containsKey('host.hostname') && !doc['host.hostname'].empty) { label = doc['host.hostname'].value; }

    if (doc.containsKey('host.entity.id') && !doc['host.entity.id'].empty) { emit(doc['host.entity.id'].value); return; }

    if (doc.containsKey('host.id') && !doc['host.id'].empty && label != null) { emit(label + '|' + doc['host.id'].value); return; }
    if (doc.containsKey('host.mac') && !doc['host.mac'].empty && label != null) { emit(label + '|' + doc['host.mac'].value); return; }
    if (doc.containsKey('host.name') && !doc['host.name'].empty && doc.containsKey('host.ip') && !doc['host.ip'].empty) { emit(doc['host.name'].value + '|' + doc['host.ip'].value); return; }
    if (doc.containsKey('host.hostname') && !doc['host.hostname'].empty && doc.containsKey('host.ip') && !doc['host.ip'].empty) { emit(doc['host.hostname'].value + '|' + doc['host.ip'].value); return; }

    if (doc.containsKey('host.id') && !doc['host.id'].empty) { emit(doc['host.id'].value); return; }
    if (doc.containsKey('host.mac') && !doc['host.mac'].empty) { emit(doc['host.mac'].value); return; }
    if (doc.containsKey('host.name') && !doc['host.name'].empty) { emit(doc['host.name'].value); return; }
    if (doc.containsKey('host.hostname') && !doc['host.hostname'].empty) { emit(doc['host.hostname'].value); return; }
    if (doc.containsKey('host.ip') && !doc['host.ip'].empty) { emit(doc['host.ip'].value); return; }

    emit('');
  `;

  // Remove leading/trailing whitespace and compress multiple spaces
  return script.trim().replace(/\n\s+/g, '\n');
};
