/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ContentRefSourceType {
  /**
   * Content coming from an integration source, in
   * which case the `sourceId` of the ContentRef will be the id of the integration
   */
  integration = 'integration',
}

/**
 * Represents a reference to a content
 */
export interface ContentRef {
  /**
   * Type of the source
   */
  sourceType: ContentRefSourceType;
  /**
   * Id of the source
   */
  sourceId: string;
  /**
   * Unique ID this content (for this sourceId).
   */
  contentId: string;
}

/**
 * Serialize a {@link ContentRef} to a string representation.
 */
export const serializeContentRef = (ref: ContentRef): string => {
  return `ref||${ref.sourceType}||${ref.sourceId}||${ref.contentId}`;
};

/**
 * Parses a serialized ref back.
 */
export const parseContentRef = (serializedRef: string): ContentRef => {
  const parts = serializedRef.split('||');
  if (parts.length !== 4) {
    throw new Error(`Trying to parse ref with invalid format: ${serializedRef}`);
  }
  return {
    sourceType: parts[1] as ContentRefSourceType,
    sourceId: parts[2],
    contentId: parts[3],
  };
};

export const contentRefBuilder =
  ({ sourceId, sourceType }: { sourceType: ContentRefSourceType; sourceId: string }) =>
  (contentId: string): ContentRef => ({ sourceId, sourceType, contentId });
