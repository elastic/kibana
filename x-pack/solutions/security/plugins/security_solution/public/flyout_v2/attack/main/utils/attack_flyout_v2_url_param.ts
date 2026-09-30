/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode } from '@kbn/rison';

/**
 * URL parameter used to auto-open the v2 attack flyout on the attacks page.
 * The value is a rison-encoded object containing the attack id and index name.
 *
 * This is separate from the legacy `flyout` URL parameter (consumed by the
 * ExpandableFlyoutProvider) because the v2 flyout is opened programmatically
 * via the system overlays API and does not sync with URL state.
 */
export const ATTACK_FLYOUT_V2_URL_PARAM = 'attackFlyoutV2' as const;

export interface AttackFlyoutV2UrlParamValue {
  attackId: string;
  indexName: string;
}

export const encodeAttackFlyoutV2UrlParam = (value: AttackFlyoutV2UrlParamValue): string =>
  encode(value);

/**
 * Decodes the value of the v2 attack flyout URL parameter. Returns null when the
 * value is missing, malformed, or does not contain a non-empty attack id.
 */
export const decodeAttackFlyoutV2UrlParam = (
  raw: string | null | undefined
): AttackFlyoutV2UrlParamValue | null => {
  if (!raw) return null;

  try {
    const decoded = decode(raw) as Partial<AttackFlyoutV2UrlParamValue> | null;
    if (!decoded || typeof decoded.attackId !== 'string' || decoded.attackId.length === 0) {
      return null;
    }
    return {
      attackId: decoded.attackId,
      indexName: typeof decoded.indexName === 'string' ? decoded.indexName : '',
    };
  } catch {
    return null;
  }
};
