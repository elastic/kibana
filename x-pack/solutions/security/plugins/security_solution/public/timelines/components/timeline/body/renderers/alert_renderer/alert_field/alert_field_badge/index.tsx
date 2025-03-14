/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { DraggableBadge } from '../../../../../../../../common/components/draggables';
import { AlertFieldFlexGroup } from '../../helpers';

export const DEFAULT_FIELD_TYPE = 'keyword';

interface Props {
  contextId: string;
  eventId: string;
  field: string;
  fieldType?: string;
  isAggregatable?: boolean;
  showSeparator: boolean;
  scopeId: string;
  value: string | number | null | undefined;
}

const AlertFieldBadgeComponent: React.FC<Props> = ({
  contextId,
  eventId,
  field,
  fieldType = DEFAULT_FIELD_TYPE,
  isAggregatable = true,
  showSeparator,
  scopeId,
  value,
}) => (
  <AlertFieldFlexGroup
    alignItems="center"
    data-test-subj="alertFieldBadge"
    $scopeId={scopeId}
    gutterSize="none"
  >
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={`${contextId}-alert-field`}
        eventId={eventId}
        field={field}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        scopeId={scopeId}
        value={value}
      />
    </EuiFlexItem>

    {showSeparator && (
      <EuiFlexItem grow={false}>
        <span data-test-subj="separator">{', '}</span>
      </EuiFlexItem>
    )}
  </AlertFieldFlexGroup>
);

AlertFieldBadgeComponent.displayName = 'AlertFieldBadgeComponent';

export const AlertFieldBadge = React.memo(AlertFieldBadgeComponent);
