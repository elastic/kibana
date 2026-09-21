/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import {
  buildActorLookupEsql,
  buildDiscoverEsqlUrl,
  buildEntityLookupEsql,
  buildSecurityEntityUrl,
} from '../navigation';
import { IocBadge } from '../shared/ioc_badge';
import {
  ATTACHMENT_ENTITY_ICON,
  attachmentEntityRefToParsed,
  parseAttachmentEntity,
  type AttachmentEntityKind,
} from './parse_attachment_entity';
import { isAttachmentEntityRef } from '../../../../common/attachment_entity_string';
import type { AttachmentEntityRef } from '../../../../common/attachment_entity_string';

const chipStyles = css`
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  margin-bottom: 4px;
  max-width: 100%;
`;

export interface EntityChipProps {
  /**
   * Structured ECS entity ref, a legacy `field: value` string, or a bare actor
   * name when `kindOverride` is `actor`.
   */
  entity: string | AttachmentEntityRef;
  /** Hunt correlation actor anchors only. */
  kindOverride?: Extract<AttachmentEntityKind, 'actor'>;
  share?: SharePluginStart;
  /**
   * When present, `host.*` / `user.*` chips link to the Security entity page
   * instead of Discover. Absent in older callers and tests, in which case
   * every chip falls back to its Discover ES|QL link.
   */
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  testSubj?: string;
}

/**
 * Compact entity chip: icon + name, optionally linked to Discover on the exact
 * ECS field from the payload (or threat-actors for correlation actors).
 */
export const EntityChip: React.FC<EntityChipProps> = ({
  entity,
  kindOverride,
  share,
  getUrlForApp,
  testSubj,
}) => {
  if (kindOverride === 'actor') {
    const name = typeof entity === 'string' ? entity : entity.value;
    const esql = buildActorLookupEsql({ value: name });
    const href = esql ? buildDiscoverEsqlUrl({ share, esql }) : undefined;

    return (
      <span css={chipStyles} data-test-subj="alertzeroEntityChip">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar
              name={name}
              iconType={ATTACHMENT_ENTITY_ICON.actor}
              color="subdued"
              size="s"
              data-test-subj="alertzeroEntityChipAvatar"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <IocBadge
              value={name}
              index={0}
              discoverHref={href}
              testSubj={testSubj ?? 'alertzeroEntityChipLink'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </span>
    );
  }

  const parsed =
    typeof entity === 'string'
      ? parseAttachmentEntity(entity)
      : isAttachmentEntityRef(entity)
      ? attachmentEntityRefToParsed(entity)
      : undefined;
  if (!parsed) {
    const raw = typeof entity === 'string' ? entity : `${entity.field}: ${entity.value}`;
    return (
      <span css={chipStyles} data-test-subj="alertzeroEntityChip">
        <IocBadge value={raw} index={0} testSubj="alertzeroEntityChipName" />
      </span>
    );
  }

  const { value, kind, field } = parsed;
  const securityEntityHref = buildSecurityEntityUrl({ getUrlForApp, field, value });
  const esql = buildEntityLookupEsql({ field, value });
  const discoverHref = esql ? buildDiscoverEsqlUrl({ share, esql }) : undefined;

  return (
    <span css={chipStyles} data-test-subj="alertzeroEntityChip">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            name={value}
            iconType={ATTACHMENT_ENTITY_ICON[kind]}
            color="subdued"
            size="s"
            data-test-subj="alertzeroEntityChipAvatar"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
          <IocBadge
            value={value}
            index={0}
            entityPageHref={securityEntityHref}
            discoverHref={discoverHref}
            testSubj={testSubj ?? 'alertzeroEntityChipLink'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
