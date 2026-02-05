/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsersTableType } from '../../../explore/users/store/model';
import { appendSearch } from './helpers';

export type EntityIdentifiers = Record<string, string>;

/**
 * Encodes entityIdentifiers for use as a single URL path segment (base64url).
 */
export const encodeEntityIdentifiersForUrl = (entityIdentifiers: EntityIdentifiers): string => {
  const json = JSON.stringify(entityIdentifiers);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Decodes entityIdentifiers from a URL path segment. Returns null if invalid.
 */
export const decodeEntityIdentifiersFromUrl = (encoded: string): EntityIdentifiers | null => {
  if (!encoded) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json) as EntityIdentifiers;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const getEntityIdentifiersSegment = (
  detailName: string,
  entityIdentifiers?: EntityIdentifiers | string
): string => {
  if (entityIdentifiers === undefined) {
    return encodeEntityIdentifiersForUrl({ 'user.name': detailName });
  }
  if (typeof entityIdentifiers === 'string') {
    return entityIdentifiers;
  }
  return encodeEntityIdentifiersForUrl(entityIdentifiers);
};

export const getUsersDetailsUrl = (
  detailName: string,
  search?: string,
  entityIdentifiers?: EntityIdentifiers | string
) => {
  const segment = getEntityIdentifiersSegment(detailName, entityIdentifiers);
  return `/name/${encodeURIComponent(detailName)}/${segment}${appendSearch(search)}`;
};

export const getTabsOnUsersDetailsUrl = (
  detailName: string,
  tabName: UsersTableType,
  search?: string,
  entityIdentifiers?: EntityIdentifiers | string
) => {
  const segment = getEntityIdentifiersSegment(detailName, entityIdentifiers);
  return `/name/${encodeURIComponent(detailName)}/${segment}/${tabName}${appendSearch(search)}`;
};

const getEntityIdentifiersSegmentForList = (
  entityIdentifiers?: EntityIdentifiers | string
): string | undefined => {
  if (entityIdentifiers === undefined) return undefined;
  if (typeof entityIdentifiers === 'string') return entityIdentifiers;
  return encodeEntityIdentifiersForUrl(entityIdentifiers);
};

export const getTabsOnUsersUrl = (
  tabName: UsersTableType,
  search?: string,
  entityIdentifiers?: EntityIdentifiers | string
) => {
  const segment = getEntityIdentifiersSegmentForList(entityIdentifiers);
  const tabPath = `/${tabName}${appendSearch(search)}`;
  return segment ? `/${segment}${tabPath}` : tabPath;
};
