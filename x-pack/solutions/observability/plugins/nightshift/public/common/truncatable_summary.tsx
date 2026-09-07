/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationFormattedText } from '../investigation/investigation_formatted_text';
import { nightshiftOpacityTransition } from './transition';

const DEFAULT_MAX_SUMMARY_LENGTH = 300;

const truncateSummary = (characters: readonly string[], maxLength: number): string => {
  if (characters.length <= maxLength) {
    return characters.join('');
  }

  let truncated = characters.slice(0, maxLength).join('');
  const backtickCount = (truncated.match(/`/g) ?? []).length;
  if (backtickCount % 2 !== 0) {
    const lastBacktick = truncated.lastIndexOf('`');
    truncated = truncated.slice(0, lastBacktick);
  }

  return `${truncated}...`;
};

export interface TruncatableSummaryProps {
  summary: string;
  maxLength?: number;
  testSubj?: string;
  toggleTestSubj?: string;
  textSize?: 's' | 'xs';
  fontSize?: string;
  bold?: boolean;
}

export function TruncatableSummary({
  summary,
  maxLength = DEFAULT_MAX_SUMMARY_LENGTH,
  testSubj,
  toggleTestSubj,
  textSize = 's',
  fontSize,
  bold = false,
}: TruncatableSummaryProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState(false);

  // Code points, not UTF-16 units, so truncation cannot split an emoji in half.
  const summaryCharacters = useMemo(() => Array.from(summary), [summary]);
  const isSummaryLong = summaryCharacters.length > maxLength;
  const displaySummary =
    isSummaryLong && !expanded ? truncateSummary(summaryCharacters, maxLength) : summary;

  const toggleSummary = useCallback(() => {
    setExpanded((previous) => !previous);
  }, []);

  return (
    <>
      <EuiText
        size={fontSize ? undefined : textSize}
        data-test-subj={testSubj}
        css={css`
          line-height: 1.5;
          ${fontSize ? `font-size: ${fontSize};` : ''}
        `}
      >
        <InvestigationFormattedText
          text={displaySummary}
          textSize={fontSize ? undefined : textSize}
          fontSize={fontSize}
          bold={bold}
        />
      </EuiText>
      {isSummaryLong && (
        // eslint-disable-next-line @elastic/eui/require-href-for-link
        <EuiLink
          data-test-subj={toggleTestSubj}
          onClick={toggleSummary}
          css={css`
            display: inline-block;
            margin-top: ${euiTheme.size.s};
            transition: ${nightshiftOpacityTransition(euiTheme)};
          `}
        >
          {expanded
            ? i18n.translate('xpack.nightshift.flyout.showLessButtonText', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.nightshift.flyout.showMoreButtonText', {
                defaultMessage: 'Show more',
              })}
        </EuiLink>
      )}
    </>
  );
}
