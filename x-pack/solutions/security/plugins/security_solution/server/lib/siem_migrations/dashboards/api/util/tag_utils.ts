/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { findTagsByName } from '../../../../tags/saved_objects/find_tags_by_name';
import { createTag } from '../../../../tags/saved_objects/create_tag';

export interface TagReference {
  id: string;
  name: string;
  type: 'tag';
}

/**
 * Finds or creates tags by name and returns tag references for saved objects
 * @param savedObjectsClient - The saved objects client
 * @param tagNames - Array of tag names to find or create
 * @returns Array of tag references that can be used in saved object references
 */
export const findOrCreateTagReferences = async (
  savedObjectsClient: SavedObjectsClientContract,
  tagNames: string[]
): Promise<TagReference[]> => {
  const tagReferences: TagReference[] = [];

  for (const tagName of tagNames) {
    let tagResults = await findTagsByName({
      savedObjectsClient,
      tagName,
    });

    // If tag doesn't exist, create it
    if (tagResults.length === 0) {
      try {
        const createdTag = await createTag({
          savedObjectsClient,
          tagName,
          description: `Auto-created tag for ${tagName}`,
        });
        // Convert SavedObject to SavedObjectsFindResult format
        tagResults = [
          {
            ...createdTag,
            score: 0,
          },
        ];
      } catch (createError) {
        // For now, we'll skip the tag silently
      }
    }

    if (tagResults.length > 0) {
      tagReferences.push({
        id: tagResults[0].id,
        name: `tag-ref-${tagName}`,
        type: 'tag',
      });
    }
  }

  return tagReferences;
};
