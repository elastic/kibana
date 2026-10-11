/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { EntityType } from '../../../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../entity_store/entity_icon_by_type';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.host]: i18n.translate('xpack.securitySolution.entityAnalytics.home.entityType.host', {
    defaultMessage: 'Host',
  }),
  [EntityType.user]: i18n.translate('xpack.securitySolution.entityAnalytics.home.entityType.user', {
    defaultMessage: 'User',
  }),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.entityType.service',
    { defaultMessage: 'Service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.entityType.generic',
    { defaultMessage: 'Generic' }
  ),
};

const ENTITY_TYPE_VALUES: readonly string[] = Object.values(EntityType);
const isEntityType = (value: unknown): value is EntityType =>
  typeof value === 'string' && ENTITY_TYPE_VALUES.includes(value);

export const EntityTypeCell = memo(({ value }: { value: unknown }) => {
  if (!isEntityType(value)) return <>{value == null ? '—' : String(value)}</>;
  const iconType = EntityIconByType[value];
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {iconType && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s">{ENTITY_TYPE_LABELS[value]}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EntityTypeCell.displayName = 'EntityTypeCell';
