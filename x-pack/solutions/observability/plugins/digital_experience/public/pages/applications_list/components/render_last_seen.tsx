/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { Formatters } from '../../../hooks/use_formatters';

/** A list's "Last seen" cell: the relative time, the date in a tooltip. */
export const renderLastSeen =
  ({ formatDate }: Formatters) =>
  (lastSeen: string | null) =>
    lastSeen === null ? (
      <EmptyCellValue />
    ) : (
      <EuiToolTip content={formatDate(lastSeen)}>
        <span tabIndex={0} data-test-subj="digitalExperienceLastSeen">
          <FormattedRelative value={new Date(lastSeen)} />
        </span>
      </EuiToolTip>
    );
