/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedQuery } from 'query-string';
import { parse } from 'query-string';
import { encode, safeDecode } from '@kbn/rison';
import { URL_PARAM_KEY } from '../../hooks/constants';
import {
  encodeQueryString,
  getParamFromQueryString,
} from '../../utils/global_query_string/helpers';

/** @deprecated Use URL_PARAM_KEY.entityId */
export const ENTITY_ID_URL_PARAM = URL_PARAM_KEY.entityId;
/** @deprecated Use URL_PARAM_KEY.identityFields */
export const IDENTITY_FIELDS_URL_PARAM = URL_PARAM_KEY.identityFields;

const stripLeadingQuestion = (urlStateQuery: string): string =>
  urlStateQuery.startsWith('?') ? urlStateQuery.slice(1) : urlStateQuery;

const isDefaultHostIdentity = (
  displayName: string,
  identityFields: Record<string, string>
): boolean => {
  const keys = Object.keys(identityFields);
  return (
    keys.length === 1 && keys[0] === 'host.name' && identityFields['host.name'] === displayName
  );
};

const isDefaultUserIdentity = (
  displayName: string,
  identityFields: Record<string, string>
): boolean => {
  const keys = Object.keys(identityFields);
  return (
    keys.length === 1 && keys[0] === 'user.name' && identityFields['user.name'] === displayName
  );
};

export interface EntityResolutionQueryOptions {
  entityId?: string;
  identityFields?: Record<string, string>;
  /** Used to omit redundant default-only identity maps from the URL */
  displayName?: string;
  entityType?: 'host' | 'user';
}

const shouldOmitIdentityFields = (options: EntityResolutionQueryOptions): boolean => {
  if (options.identityFields === undefined) {
    return true;
  }
  if (Object.keys(options.identityFields).length === 0) {
    return true;
  }
  /**
   * Without a canonical entity store id in the URL, keep identityFields encoded so resolution,
   * tab navigation, and entity-store v2 fallbacks still receive explicit identifiers when the
   * entity is not (or not yet) in the store.
   */
  if (options.entityId === undefined || options.entityId === '') {
    return false;
  }
  if (options.displayName === undefined || options.entityType === undefined) {
    return false;
  }
  if (options.entityType === 'host') {
    return isDefaultHostIdentity(options.displayName, options.identityFields);
  }
  return isDefaultUserIdentity(options.displayName, options.identityFields);
};

const parseIdentityFieldsLegacy = (raw: string): Record<string, string> | undefined => {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return undefined;
};

/**
 * Merges Rison-encoded entityId / identityFields into the Security app URL state query
 * (same encoding as timerange, valueReport, timeline, etc.).
 */
export const mergeEntityResolutionIntoUrlState = (
  urlStateQuery: string | undefined,
  options: EntityResolutionQueryOptions
): string => {
  const raw = stripLeadingQuestion(urlStateQuery ?? '');
  const urlParams = parse(raw, { sort: false }) as ParsedQuery<string>;

  delete urlParams[URL_PARAM_KEY.entityId];
  delete urlParams[URL_PARAM_KEY.identityFields];

  if (options.entityId !== undefined && options.entityId !== '') {
    try {
      urlParams[URL_PARAM_KEY.entityId] = encode(options.entityId);
    } catch {
      // ignore encode failures
    }
  }

  if (
    !shouldOmitIdentityFields(options) &&
    options.identityFields !== undefined &&
    Object.keys(options.identityFields).length > 0
  ) {
    try {
      urlParams[URL_PARAM_KEY.identityFields] = encode(options.identityFields);
    } catch {
      // ignore encode failures
    }
  }

  const encoded = encodeQueryString(urlParams);
  return encoded === '' ? '' : `?${encoded}`;
};

/**
 * Reads entityId and identityFields from location.search (Rison values; supports legacy JSON identityFields).
 */
export const parseEntityResolutionFromUrlState = (
  urlStateQuery: string | undefined
): { entityId?: string; identityFields?: Record<string, string> } => {
  const raw = stripLeadingQuestion(urlStateQuery ?? '');
  if (raw === '') {
    return {};
  }

  const entityIdRaw = getParamFromQueryString(raw, URL_PARAM_KEY.entityId);
  const identityRaw = getParamFromQueryString(raw, URL_PARAM_KEY.identityFields);

  let entityId: string | undefined;
  if (entityIdRaw != null && entityIdRaw !== '') {
    const decoded = safeDecode(entityIdRaw);
    if (typeof decoded === 'string') {
      entityId = decoded;
    } else {
      try {
        entityId = decodeURIComponent(entityIdRaw);
      } catch {
        entityId = entityIdRaw;
      }
    }
  }

  let identityFields: Record<string, string> | undefined;
  if (identityRaw != null && identityRaw !== '') {
    const decoded = safeDecode(identityRaw);
    if (typeof decoded === 'object' && decoded !== null && !Array.isArray(decoded)) {
      identityFields = decoded as Record<string, string>;
    } else {
      identityFields = parseIdentityFieldsLegacy(identityRaw);
    }
  }

  return { entityId, identityFields };
};
