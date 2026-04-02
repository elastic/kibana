/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsersTableType } from '../../../explore/users/store/model';
import { mergeEntityResolutionIntoUrlState } from './entity_resolution_query_params';

export type EntityIdentifiers = Record<string, string>;

/**
 * Decodes entity identifiers from a legacy base64url path segment. Returns null if invalid.
 */
export const decodeEntityIdentifiersFromUrl = (encoded: string): EntityIdentifiers | null => {
  if (!encoded) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(json) as EntityIdentifiers;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Parses the legacy encoded entity-identifiers path segment (redirect compatibility).
 */
export const parseEntityIdentifiersFromUrlParam = (
  encoded: string | undefined
): { entityId?: string; identityFields?: Record<string, string> } => {
  if (encoded == null || encoded === '') {
    return {};
  }
  const decoded = decodeEntityIdentifiersFromUrl(encoded);
  if (!decoded) {
    return {};
  }
  const { entityId: rawEntityId, ...rest } = decoded;
  const entityId = typeof rawEntityId === 'string' && rawEntityId !== '' ? rawEntityId : undefined;
  const identityFields =
    Object.keys(rest).length > 0 ? (rest as Record<string, string>) : undefined;
  return { entityId, identityFields };
};

export const getUsersDetailsUrl = (
  detailName: string,
  urlStateQuery?: string,
  identityFields?: Record<string, string>,
  entityId?: string
) => {
  const base = `/name/${encodeURIComponent(detailName)}`;
  const query = mergeEntityResolutionIntoUrlState(urlStateQuery, {
    entityId,
    identityFields,
    displayName: detailName,
    entityType: 'user',
  });
  return query === '' ? base : `${base}${query}`;
};

export const getTabsOnUsersDetailsUrl = (
  detailName: string,
  tabName: UsersTableType,
  urlStateQuery?: string,
  entityId?: string,
  identityFields?: Record<string, string>
) => {
  const base = `/name/${encodeURIComponent(detailName)}/${tabName}`;
  const query = mergeEntityResolutionIntoUrlState(urlStateQuery, {
    entityId,
    identityFields,
    displayName: detailName,
    entityType: 'user',
  });
  return query === '' ? base : `${base}${query}`;
};

export const getTabsOnUsersUrl = (
  tabName: UsersTableType,
  urlStateQuery?: string,
  entityIdentifiers?: EntityIdentifiers | string
) => {
  const resolution =
    typeof entityIdentifiers === 'string'
      ? { entityId: entityIdentifiers }
      : { identityFields: entityIdentifiers };
  const query = mergeEntityResolutionIntoUrlState(urlStateQuery, resolution);
  const tabPath = `/${tabName}`;
  return query === '' ? tabPath : `${tabPath}${query}`;
};
