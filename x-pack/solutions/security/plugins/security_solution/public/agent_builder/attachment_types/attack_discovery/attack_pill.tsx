/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import {
  FLYOUT_DESCRIPTOR_KIND,
  type FlyoutDescriptor,
} from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FlyoutPill } from '../conversation_details/pills';

interface AttackPillProps {
  attachment: UnknownAttachment;
  getSpaceId: () => Promise<string>;
  label: string;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Pill for `security.attack_discovery` — opens the attack flyout.
 * The index is the comma-joined pattern for the attack-discovery space indices;
 * `useAttackDetails` resolves the concrete `_index` from the hit.
 */
export const AttackPill = memo(
  ({ attachment, getSpaceId, label, resolveSecurityCanvasContext }: AttackPillProps) => {
    const data = attachment.data as { id?: unknown } | undefined;
    const attackId =
      typeof data?.id === 'string'
        ? data.id
        : typeof attachment.origin === 'string'
        ? attachment.origin
        : undefined;

    const resolveDescriptor = useCallback(async (): Promise<FlyoutDescriptor | null> => {
      if (!attackId) return null;
      const spaceId = await getSpaceId();
      const indexName = [
        ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
        ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
      ]
        .map((prefix) => `${prefix}-${spaceId}`)
        .join(',');
      return { kind: FLYOUT_DESCRIPTOR_KIND.attack, attackId, indexName };
    }, [attackId, getSpaceId]);

    if (!attackId) return null;

    return (
      <FlyoutPill
        label={label}
        resolveDescriptor={resolveDescriptor}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );
  }
);
AttackPill.displayName = 'AttackPill';
