/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { convertFieldToDisplayName } from '../../../rule_management/components/rule_details/helpers';

interface ChangedFieldsBadgesProps {
  fields: string[];
  inlineLimit: number;
  overflowLimit: number;
}

/**
 * Render the changed-field list as inline badges, collapsing overflow into a
 * trailing "+N" badge. The badge's native `title` lists up to `overflowLimit`
 * additional field names on hover — caller chooses if they want richer popover
 * UX by wrapping us in one.
 */
export const ChangedFieldsBadges = memo(function ChangedFieldsBadges({
  fields,
  inlineLimit,
  overflowLimit,
}: ChangedFieldsBadgesProps): JSX.Element | null {
  if (fields.length === 0) {
    return null;
  }

  const visible = fields.slice(0, inlineLimit);
  const overflowFields = fields.slice(inlineLimit);
  const overflowFieldNames = overflowFields.slice(0, overflowLimit).map(convertFieldToDisplayName);
  const isLargeOverflow = overflowFields.length > overflowLimit;

  return (
    <>
      {visible.map((field) => (
        <EuiBadge key={field} color="hollow">
          {convertFieldToDisplayName(field)}
        </EuiBadge>
      ))}
      &nbsp;
      {overflowFieldNames.length > 0 && (
        <EuiToolTip content={`${overflowFieldNames.join(', ')}${isLargeOverflow ? ', +' : ''}`}>
          <EuiBadge color="hollow">{`+${overflowFieldNames.length}${
            isLargeOverflow ? '+' : ''
          }`}</EuiBadge>
        </EuiToolTip>
      )}
    </>
  );
});
