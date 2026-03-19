/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import {
  getObservablesFromFlattedEcs,
  type FlattedEcsData,
  type GetAttachmentDataContext,
} from '@kbn/cases-plugin/server';

const fetchEventFlattedEcs = async (
  context: GetAttachmentDataContext
): Promise<FlattedEcsData[] | null> => {
  const { esClient, attachmentId, metadata } = context;
  const index = (metadata?.index as string) ?? '';
  const trimmedIndex = typeof index === 'string' ? index.trim() : '';
  if (!attachmentId || !trimmedIndex) {
    return null;
  }

  const response = await esClient.search({
    index: trimmedIndex,
    query: { ids: { values: [attachmentId] } },
    fields: ['*'],
    size: 1,
  });

  const hits = response.hits?.hits ?? [];
  const row = hits[0];
  if (!row || !('fields' in row)) {
    return null;
  }

  const fields = (row as { fields?: Record<string, unknown> }).fields ?? {};
  return [
    ...Object.entries(fields).map(([field, value]) => ({
      field,
      value: Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : null,
    })),
    { field: '_id', value: [row._id as string] },
  ];
};

/**
 * Server-side event attachment type registration.
 * schemaValidator receives metadata for reference-based attachments.
 * getObservables fetches event document from ES and extracts observables (including dummy).
 */
export const getEventAttachmentType = () => ({
  id: EVENT_ATTACHMENT_TYPE,
  schemaValidator: (metadata: unknown) => {
    if (metadata != null && typeof metadata === 'object') {
      const m = metadata as Record<string, unknown>;
      if (m.index != null) {
        const index = m.index;
        if (typeof index !== 'string') {
          throw badRequest('metadata.index must be a string');
        }
      }
    }
  },
  getObservables: async (context: GetAttachmentDataContext) => {
    const data = await fetchEventFlattedEcs(context);
    if (!data) {
      return [];
    }
    const observables = getObservablesFromFlattedEcs([data]);
    return [
      {
        typeKey: 'observable-type-hostname' as const,
        value: 'event specific observable',
      },
      ...observables,
    ];
  },
});
