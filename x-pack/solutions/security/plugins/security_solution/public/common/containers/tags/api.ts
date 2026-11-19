/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ITagsClient,
  TagAttributes,
  Tag as TagResponse,
} from '@kbn/saved-objects-tagging-oss-plugin/common';

export interface Tag {
  id: string;
  managed: boolean;
  attributes: TagAttributes;
}

export const getTagsByName = async ({
  savedObjectsTaggingClient,
  tagName,
}: {
  savedObjectsTaggingClient: ITagsClient | undefined;
  tagName: string;
}): Promise<TagResponse[] | null> => {
  const tag = await savedObjectsTaggingClient?.findByName(tagName, { exact: true });

  return tag ? [tag] : [];
};

// Dashboard listing needs savedObjectsTaggingClient to work correctly with cache.
// https://github.com/elastic/kibana/issues/160723#issuecomment-1641904984
export const createTag = ({
  savedObjectsTaggingClient,
  tag,
}: {
  savedObjectsTaggingClient: ITagsClient;
  tag: TagAttributes;
}): Promise<TagResponse> => savedObjectsTaggingClient.create(tag);
