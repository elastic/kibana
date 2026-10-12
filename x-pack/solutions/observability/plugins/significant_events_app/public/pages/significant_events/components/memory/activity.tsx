/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryPageRow } from './page_row';
import type { MemorySummary } from './types';

interface MemoryActivityProps {
  pages: MemorySummary[];
  onSelectPage: (id: string) => void;
}

export function MemoryActivity({ pages, onSelectPage }: MemoryActivityProps) {
  // Newest first: the point of this view is "what changed".
  const ordered = useMemo(
    () => [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [pages]
  );

  return (
    <div data-test-subj="nightshiftMemoryActivity">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.activityTitle"
            defaultMessage="Activity"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer />
      {ordered.length === 0 ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.activityEmpty"
            defaultMessage="No memory updates yet. They appear here after an investigation writes or retires one."
          />
        </EuiText>
      ) : (
        ordered.map((page, index) => (
          <React.Fragment key={page.id}>
            {index > 0 && <EuiHorizontalRule margin="s" />}
            <MemoryPageRow page={page} onSelectPage={onSelectPage} />
          </React.Fragment>
        ))
      )}
    </div>
  );
}
