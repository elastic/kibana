/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { WikiPageRow } from './page_row';
import type { WikiPageSummary } from './types';

interface WikiActivityProps {
  pages: WikiPageSummary[];
  onSelectPage: (id: string) => void;
}

export function WikiActivity({ pages, onSelectPage }: WikiActivityProps) {
  const recent = useMemo(
    () => [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [pages]
  );

  return (
    <div data-test-subj="nightshiftWikiActivity">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.activityTitle"
            defaultMessage="Activity"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer />
      {recent.length === 0 ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.activityEmptyDescription"
            defaultMessage="No Wiki updates yet. Pages appear here after investigations write to the wiki."
          />
        </EuiText>
      ) : (
        recent.map((page, index) => (
          <React.Fragment key={page.id}>
            {index > 0 && <EuiHorizontalRule margin="s" />}
            <WikiPageRow page={page} onSelectPage={onSelectPage} />
          </React.Fragment>
        ))
      )}
    </div>
  );
}
