/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
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
export function ChangedFieldsBadges({
  fields,
  inlineLimit,
  overflowLimit,
}: ChangedFieldsBadgesProps): JSX.Element | null {
  if (fields.length === 0) {
    return null;
  }

  const visible = fields.slice(0, inlineLimit);
  const overflowCount = Math.max(0, fields.length - inlineLimit);
  const overflowTitle = fields
    .slice(inlineLimit, inlineLimit + overflowLimit)
    .map(convertFieldToDisplayName)
    .join(', ');

  return (
    <>
      {visible.map((field) => (
        <EuiBadge key={field} color="hollow">
          {convertFieldToDisplayName(field)}
        </EuiBadge>
      ))}
      {overflowCount > 0 && (
        <EuiBadge color="hollow" title={overflowTitle}>
          {`+${overflowCount}`}
        </EuiBadge>
      )}
    </>
  );
}
