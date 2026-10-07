/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType } from 'react';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import type { FlyoutGroupedAttachmentRendererProps } from '@kbn/agentic-investigations-common';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { ATTACK_SUBTITLE, FlyoutRow, useSpaceId } from '../grouped_attachments';
import { getAttackDiscoveryLabel } from './attack_discovery_attachment';
import type { AttackDiscoveryAttachment } from './attack_discovery_attachment';

export interface AttacksGroupRendererDeps {
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

export const createAttacksGroupRenderer = ({
  getSpaceId,
  resolveSecurityCanvasContext,
}: AttacksGroupRendererDeps): ComponentType<FlyoutGroupedAttachmentRendererProps> => {
  const AttacksGroupRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => {
    const spaceId = useSpaceId(getSpaceId);

    if (!spaceId) {
      return null;
    }

    const attacks = new Map<string, AttackDiscoveryAttachment>();
    for (const attachment of attachments) {
      const attack = attachment as AttackDiscoveryAttachment;
      const attackId = attack.data?.id ?? attack.origin;
      if (attackId && !attacks.has(attackId)) {
        attacks.set(attackId, attack);
      }
    }

    const indexName = [
      ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
      ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
    ]
      .map((prefix) => `${prefix}-${spaceId}`)
      .join(',');

    return (
      <>
        {[...attacks].map(([attackId, attack]) => (
          <FlyoutRow
            key={attackId}
            iconType="bolt"
            iconColor="danger"
            title={getAttackDiscoveryLabel(attack)}
            subtitle={ATTACK_SUBTITLE}
            descriptor={{ kind: FLYOUT_DESCRIPTOR_KIND.attack, attackId, indexName }}
            resolveSecurityCanvasContext={resolveSecurityCanvasContext}
          />
        ))}
      </>
    );
  };

  return AttacksGroupRenderer;
};
