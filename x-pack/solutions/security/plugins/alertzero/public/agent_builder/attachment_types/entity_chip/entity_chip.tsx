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
import { buildDiscoverEsqlUrl, buildEntityLookupEsql, DiscoverLink } from '../navigation';
import {
  ATTACHMENT_ENTITY_ICON,
  parseAttachmentEntity,
  type AttachmentEntityKind,
  type ParsedAttachmentEntity,
} from './parse_attachment_entity';

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
  /** Raw entity string from the attachment, or a pre-parsed entity. */
  entity: string | ParsedAttachmentEntity;
  /** Override kind (e.g. hunt correlation `actor` anchors). */
  kindOverride?: AttachmentEntityKind;
  /** When present, entity name links to a Discover ES|QL lookup. */
  share?: SharePluginStart;
  testSubj?: string;
}

/**
 * Compact entity presentation inspired by Security flyout Insights Entities:
 * type icon + name. Name links to Discover when a lookup query is available.
 */
export const EntityChip: React.FC<EntityChipProps> = ({
  entity,
  kindOverride,
  share,
  testSubj,
}) => {
  const parsed = typeof entity === 'string' ? parseAttachmentEntity(entity) : entity;
  const kind = kindOverride ?? parsed.kind;
  const { name } = parsed;
  const esql = buildEntityLookupEsql({ kind, value: name });
  const href = esql ? buildDiscoverEsqlUrl({ share, esql }) : undefined;

  return (
    <span css={chipStyles} data-test-subj="alertzeroEntityChip">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            name={name}
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
                {name}
              </strong>
            </DiscoverLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
