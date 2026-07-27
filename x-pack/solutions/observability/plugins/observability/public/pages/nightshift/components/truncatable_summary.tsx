/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DEFAULT_MAX_SUMMARY_LENGTH = 300;

export interface TruncatableSummaryProps {
  summary: string;
  maxLength?: number;
  testSubj?: string;
  toggleTestSubj?: string;
}

export function TruncatableSummary({
  summary,
  maxLength = DEFAULT_MAX_SUMMARY_LENGTH,
  testSubj,
  toggleTestSubj,
}: TruncatableSummaryProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  // Code points, not UTF-16 units, so truncation cannot split an emoji in half.
  const summaryCharacters = useMemo(() => Array.from(summary), [summary]);
  const isSummaryLong = summaryCharacters.length > maxLength;
  const displaySummary =
    isSummaryLong && !expanded ? summaryCharacters.slice(0, maxLength).join('') + '...' : summary;

  const toggleSummary = useCallback(() => {
    setExpanded((previous) => !previous);
  }, []);

  return (
    <>
      <EuiText size="s" data-test-subj={testSubj}>
        <p>{displaySummary}</p>
      </EuiText>
      {isSummaryLong && (
        // eslint-disable-next-line @elastic/eui/require-href-for-link
        <EuiLink data-test-subj={toggleTestSubj} onClick={toggleSummary}>
          {expanded
            ? i18n.translate('xpack.observability.nightshift.flyout.showLessButtonText', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.observability.nightshift.flyout.showMoreButtonText', {
                defaultMessage: 'Show more',
              })}
        </EuiLink>
      )}
    </>
  );
}
