/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { useFlyoutPill } from './use_flyout_pill';
import { CONVERSATION_DETAILS_LABELS } from './translations';

interface AttackPillProps {
  attachment: UnknownAttachment;
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Pill for `security.attack_discovery` — always opens the attack flyout.
 * The index name is resolved at click time by querying both attack-discovery index prefixes.
 */
export const AttackPill = memo(
  ({ attachment, getSpaceId, search, resolveSecurityCanvasContext }: AttackPillProps) => {
    const data = attachment.data as { id?: unknown } | undefined;
    const attackId =
      typeof data?.id === 'string'
        ? data.id
        : typeof attachment.origin === 'string'
        ? attachment.origin
        : undefined;

    const resolveDescriptor = useCallback(async () => {
      if (!attackId) return null;
      const spaceId = await getSpaceId();
      const indices = [
        `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
        `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
      ].join(',');
      const result = await lastValueFrom(
        search({
          params: {
            index: indices,
            body: { query: { ids: { values: [attackId] } }, size: 1, _source: false },
          },
        })
      );
      const hit = result.rawResponse.hits.hits[0];
      if (!hit) return null;
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.attack,
        attackId,
        indexName: hit._index,
      } as const;
    }, [attackId, getSpaceId, search]);

    const pill = useFlyoutPill({
      label: CONVERSATION_DETAILS_LABELS.attacks(1),
      resolveDescriptor,
      resolveSecurityCanvasContext,
    });

    if (!attackId) return null;
    return <>{pill}</>;
  }
);
AttackPill.displayName = 'AttackPill';
