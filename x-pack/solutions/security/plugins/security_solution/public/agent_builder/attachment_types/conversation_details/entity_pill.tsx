/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EntityAttachment } from '../entity_attachment/types';
import { normaliseEntityAttachment } from '../entity_attachment/payload';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { buildEntitiesPageUrl } from './security_urls';
import { toEntityDescriptor } from './to_flyout_descriptor';
import { useFlyoutPill } from './use_flyout_pill';
import { LinkPill } from './attachment_pill';
import { CONVERSATION_DETAILS_LABELS } from './translations';

interface EntityPillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const EntitySinglePill = memo(
  ({
    entity,
    resolveSecurityCanvasContext,
    label,
  }: {
    entity: NonNullable<ReturnType<typeof normaliseEntityAttachment>>['entities'][number];
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
    label: string;
  }) => {
    const resolveDescriptor = useCallback(
      () => Promise.resolve(toEntityDescriptor(entity)),
      [entity]
    );
    return <>{useFlyoutPill({ label, resolveDescriptor, resolveSecurityCanvasContext })}</>;
  }
);
EntitySinglePill.displayName = 'EntitySinglePill';

/**
 * Pill for `security.entity` attachments.
 * - 1 entity → opens the entity flyout
 * - N entities → opens the Entity Analytics page with a KQL filter
 */
export const EntityPill = memo(
  ({ attachment, application, resolveSecurityCanvasContext }: EntityPillProps) => {
    const normalised = normaliseEntityAttachment(attachment as unknown as EntityAttachment);
    if (!normalised) return null;

    const { entities } = normalised;
    const count = entities.length;
    if (count === 0) return null;

    const label = CONVERSATION_DETAILS_LABELS.entities(count);

    if (count === 1 && toEntityDescriptor(entities[0]) != null) {
      return (
        <EntitySinglePill
          entity={entities[0]}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
          label={label}
        />
      );
    }

    const terms = entities.map((e) => e.entityStoreId ?? e.identifier);
    const href = buildEntitiesPageUrl({ terms, application });
    return <LinkPill label={label} href={href} />;
  }
);
EntityPill.displayName = 'EntityPill';
