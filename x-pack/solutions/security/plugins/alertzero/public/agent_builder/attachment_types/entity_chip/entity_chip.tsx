/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, useEuiTheme, type IconType } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { buildDiscoverEsqlUrl, buildEntityLookupEsql, buildSecurityEntityUrl } from '../navigation';
import { IocBadge, OPEN_ENTITY_PAGE_LABEL, discoverAction } from '../shared/ioc_badge';
import type {
  AttachmentEntityField,
  AttachmentEntityRef,
} from '../../../../common/attachment_entity';

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
  entity: AttachmentEntityRef;
  share?: SharePluginStart;
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  testSubj?: string;
}

/**
 * Entity value badge with a small kind icon (user / host / service) in front. The ECS field
 * the value came from is exposed on hover of the icon so identical-looking values (a user name
 * vs. a host name) stay distinguishable without adding a label column.
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
    max-width: 100%;
    min-width: 0;
    padding-right: ${euiTheme.size.xs};
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
          <EuiIconTip
            type={ATTACHMENT_ENTITY_ICON[kind]}
            color="subdued"
            size="s"
            content={field}
            aria-label={field}
            iconProps={{ 'data-test-subj': 'alertzeroEntityChipAvatar' }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <IocBadge
            value={value}
            action={
              securityEntityHref
                ? { href: securityEntityHref, iconType: 'user', label: OPEN_ENTITY_PAGE_LABEL }
                : discoverAction(discoverHref)
            }
            testSubj={testSubj ?? 'alertzeroEntityChipLink'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  );
};
