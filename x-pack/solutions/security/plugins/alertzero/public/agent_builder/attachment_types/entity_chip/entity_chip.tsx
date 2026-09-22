/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, useEuiTheme, type IconType } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { buildDiscoverEsqlUrl, buildEntityLookupEsql, buildSecurityEntityUrl } from '../navigation';
import { IocBadge } from '../shared/ioc_badge';
import type { AttachmentEntityField, AttachmentEntityRef } from '../../../../common/attachment_entity';

/** Visual kinds for chip icons. Entity chips derive kind from the ECS field on the payload. */
type AttachmentEntityKind = 'user' | 'host' | 'service' | 'generic';

const ATTACHMENT_ENTITY_ICON: Record<AttachmentEntityKind, IconType> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  generic: 'globe',
};

const FIELD_TO_KIND: Readonly<Record<AttachmentEntityField, AttachmentEntityKind>> = {
  'user.name': 'user',
  'user.email': 'user',
  'user.id': 'user',
  'host.name': 'host',
  'host.hostname': 'host',
  'host.id': 'host',
  'service.name': 'service',
  'service.id': 'service',
};

export interface EntityChipProps {
  /** Structured ECS entity ref written by the schema. */
  entity: AttachmentEntityRef;
  share?: SharePluginStart;
  /**
   * When present, `host.*` / `user.*` chips link to the Security entity page
   * instead of Discover. When absent, every chip falls back to its Discover
   * ES|QL link.
   */
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  testSubj?: string;
}

/**
 * Compact entity chip: icon + name, linked to Discover on the exact ECS
 * field from the payload (or to the Security entity page when available).
 */
export const EntityChip: React.FC<EntityChipProps> = ({
  entity,
  share,
  getUrlForApp,
  testSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const chipStyles = css`
    display: inline-flex;
    align-items: center;
    margin-right: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.xs};
    max-width: 100%;
  `;

  const { field, value } = entity;
  const kind = FIELD_TO_KIND[field];
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
