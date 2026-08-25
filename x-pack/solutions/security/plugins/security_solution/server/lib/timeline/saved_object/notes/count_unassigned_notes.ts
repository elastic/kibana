/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObjectNoteWithoutExternalRefs } from '../../../../../common/types/timeline/note/saved_object';
import { noteSavedObjectType, timelineSavedObjectType } from '../../saved_object_mappings';

/*
 * Count notes that are not associated with the timeline & are linked to given document
 */
export const countUnassignedNotesLinkedToDocument = async (
  savedObjectsClient: SavedObjectsClientContract,
  documentId: string
) => {
  const notesCount = await savedObjectsClient.find<SavedObjectNoteWithoutExternalRefs>({
    type: noteSavedObjectType,
    hasReference: { type: timelineSavedObjectType, id: '' },
    filter: nodeBuilder.is(`${noteSavedObjectType}.attributes.eventId`, documentId),
  });

  return notesCount.total;
};
