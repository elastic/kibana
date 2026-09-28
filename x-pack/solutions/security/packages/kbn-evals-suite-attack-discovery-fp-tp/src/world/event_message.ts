/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2IndexedRawEvent } from '@kbn/evals-suite-attack-discovery-agent-builder';

export const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const hasCategory = (source: Record<string, unknown>, category: string): boolean => {
  const categories = asRecord(source.event).category;
  return Array.isArray(categories) && categories.includes(category);
};

/**
 * Rebuilds a raw event's `message` from its process, network, and file fields, so the
 * text never narrates a verdict and stays true after a mutation rewrites those fields.
 */
export const withFieldMessage = (event: Ad2IndexedRawEvent): Ad2IndexedRawEvent => {
  const process = asRecord(event.source.process);
  const parent = asRecord(process.parent);
  const destination = asRecord(event.source.destination);
  if (hasCategory(event.source, 'network')) {
    return {
      ...event,
      source: {
        ...event.source,
        message: `${process.name} connected to ${destination.domain} (${destination.ip}:${destination.port})`,
      },
    };
  }
  if (hasCategory(event.source, 'process')) {
    return {
      ...event,
      source: {
        ...event.source,
        message: parent.name ? `${parent.name} started ${process.name}` : `${process.name} started`,
      },
    };
  }
  if (hasCategory(event.source, 'file')) {
    const file = asRecord(event.source.file);
    return {
      ...event,
      source: { ...event.source, message: `${process.name} created ${file.path}` },
    };
  }
  return event;
};
