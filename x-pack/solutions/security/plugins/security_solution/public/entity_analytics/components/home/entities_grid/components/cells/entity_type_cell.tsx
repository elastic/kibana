/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { EntityType } from '../../../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../entity_store/entity_icon_by_type';
import { getRiskEntityTranslation } from '../../../../risk_score/translations';

const isEntityType = (value: unknown): value is EntityType =>
  Object.values(EntityType).some((type) => type === value);

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
        <EuiText size="s">{getRiskEntityTranslation(value)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EntityTypeCell.displayName = 'EntityTypeCell';
