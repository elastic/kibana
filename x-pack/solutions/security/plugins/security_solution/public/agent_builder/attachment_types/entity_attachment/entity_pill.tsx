/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { encode } from '@kbn/rison';
import { escapeQuotes } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import {
  FLYOUT_DESCRIPTOR_KIND,
  type FlyoutDescriptor,
} from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FlyoutPill, LinkPill } from '../conversation_details/pills';
import { normaliseEntityAttachment } from './payload';
import type { EntityAttachment, NormalisedEntityAttachment } from './types';

const entitiesLabel = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.pillLabel', {
    defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
    values: { count },
  });

/**
 * Maps a normalised entity onto the flyout descriptor that matches its `identifierType`.
 * Returns `null` for unknown types.
 */
const toEntityDescriptor = (
  entity: NormalisedEntityAttachment['entities'][number]
): FlyoutDescriptor | null => {
  const { identifierType, identifier, entityStoreId } = entity;

  switch (identifierType) {
    case 'host':
      return { kind: FLYOUT_DESCRIPTOR_KIND.host, hostName: identifier, entityId: entityStoreId };
    case 'user':
      return { kind: FLYOUT_DESCRIPTOR_KIND.user, userName: identifier, entityId: entityStoreId };
    case 'service':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.service,
        serviceName: identifier,
        entityId: entityStoreId,
      };
    case 'generic':
      return entityStoreId
        ? { kind: FLYOUT_DESCRIPTOR_KIND.genericEntity, scopeId: '', entityId: entityStoreId }
        : null;
    default:
      return null;
  }
};

const EntitySinglePill = memo(
  ({
    entity,
    label,
    resolveSecurityCanvasContext,
  }: {
    entity: NormalisedEntityAttachment['entities'][number];
    label: string;
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  }) => {
    const descriptor = toEntityDescriptor(entity);
    const resolveDescriptor = useCallback(() => Promise.resolve(descriptor), [descriptor]);

    if (!descriptor) return null;
    return (
      <FlyoutPill
        label={label}
        resolveDescriptor={resolveDescriptor}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );
  }
);
EntitySinglePill.displayName = 'EntitySinglePill';

interface EntityPillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

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

    const label = entitiesLabel(count);

    if (count === 1) {
      return (
        <EntitySinglePill
          entity={entities[0]}
          label={label}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      );
    }

    const terms = entities.map((e) => e.entityStoreId ?? e.identifier);
    const kql = terms
      .map((t) => `entity.id: "${escapeQuotes(t)}" or entity.name: "${escapeQuotes(t)}"`)
      .join(' or ');
    const cspq = encode({ filters: [], pageIndex: 0, query: { language: 'kuery', query: kql } });
    const href = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.entityAnalyticsHomePage,
      path: `?cspq=${cspq}`,
    });
    return <LinkPill label={label} href={href} />;
  }
);
EntityPill.displayName = 'EntityPill';
