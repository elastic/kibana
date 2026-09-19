/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ATTACHMENT_ENTITY_ICON,
  parseAttachmentEntity,
  type AttachmentEntityKind,
  type ParsedAttachmentEntity,
} from './parse_attachment_entity';

const ENTITY_KIND_LABEL: Record<AttachmentEntityKind, string> = {
  user: i18n.translate('xpack.alertzero.agentBuilder.attachments.entityChip.kind.user', {
    defaultMessage: 'User',
  }),
  host: i18n.translate('xpack.alertzero.agentBuilder.attachments.entityChip.kind.host', {
    defaultMessage: 'Host',
  }),
  service: i18n.translate('xpack.alertzero.agentBuilder.attachments.entityChip.kind.service', {
    defaultMessage: 'Service',
  }),
  actor: i18n.translate('xpack.alertzero.agentBuilder.attachments.entityChip.kind.actor', {
    defaultMessage: 'Actor',
  }),
  generic: i18n.translate('xpack.alertzero.agentBuilder.attachments.entityChip.kind.generic', {
    defaultMessage: 'Entity',
  }),
};

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
  testSubj?: string;
}

/**
 * Compact entity presentation inspired by Security flyout Insights Entities /
 * Agent Builder entity identity headers: avatar with type icon, name, type badge.
 * Visual-only (no Entity Analytics flyout navigation in this plan).
 */
export const EntityChip: React.FC<EntityChipProps> = ({ entity, kindOverride, testSubj }) => {
  const parsed = typeof entity === 'string' ? parseAttachmentEntity(entity) : entity;
  const kind = kindOverride ?? parsed.kind;
  const { name } = parsed;

  return (
    <span css={chipStyles} data-test-subj={testSubj ?? 'alertzeroEntityChip'}>
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
            <strong css={nameStyles} data-test-subj="alertzeroEntityChipName">
              {name}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="alertzeroEntityChipKind">
            {ENTITY_KIND_LABEL[kind]}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
