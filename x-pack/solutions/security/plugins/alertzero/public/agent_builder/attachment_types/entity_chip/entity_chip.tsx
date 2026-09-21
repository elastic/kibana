/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  buildActorLookupEsql,
  buildDiscoverEsqlUrl,
  buildEntityLookupEsql,
  DiscoverLink,
} from '../navigation';
import {
  ATTACHMENT_ENTITY_ICON,
  attachmentEntityRefToParsed,
  parseAttachmentEntity,
  type AttachmentEntityKind,
  type ParsedAttachmentEntity,
} from './parse_attachment_entity';
import { isAttachmentEntityRef } from '../../../../common/attachment_entity_string';
import type { AttachmentEntityRef } from '../../../../common/attachment_entity_string';

const chipStyles = css`
  display: inline-flex;
  margin-right: 8px;
  margin-bottom: 4px;
  max-width: 100%;
`;

const nameStyles = css`
  overflow-wrap: anywhere;
`;

export interface EntityChipProps {
  /**
   * Structured ECS entity ref, a pre-parsed entity, a legacy `field: value`
   * string, or a bare actor name when `kindOverride` is `actor`.
   */
  entity: string | AttachmentEntityRef | ParsedAttachmentEntity;
  /** Hunt correlation actor anchors only. */
  kindOverride?: Extract<AttachmentEntityKind, 'actor'>;
  share?: SharePluginStart;
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
            <EuiText size="xs">
              <DiscoverLink href={href} testSubj={testSubj ?? 'alertzeroEntityChipLink'}>
                <strong css={nameStyles} data-test-subj="alertzeroEntityChipName">
                  {name}
                </strong>
              </DiscoverLink>
            </EuiText>
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
      : entity;
  if (!parsed) {
    const raw =
      typeof entity === 'string'
        ? entity
        : isAttachmentEntityRef(entity)
        ? `${entity.field}: ${entity.value}`
        : entity.raw;
    return (
      <span css={chipStyles} data-test-subj="alertzeroEntityChip">
        <EuiText size="xs">
          <strong css={nameStyles} data-test-subj="alertzeroEntityChipName">
            {raw}
          </strong>
        </EuiText>
      </span>
    );
  }

  const { value, kind, field } = parsed;
  const esql = buildEntityLookupEsql({ field, value });
  const href = esql ? buildDiscoverEsqlUrl({ share, esql }) : undefined;

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
          <EuiText size="xs">
            <DiscoverLink href={href} testSubj={testSubj ?? 'alertzeroEntityChipLink'}>
              <strong css={nameStyles} data-test-subj="alertzeroEntityChipName">
                {value}
              </strong>
            </DiscoverLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
