/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { escapeRegExp } from 'lodash';
import type { SearchHighlight } from '../../rule_management/api/hooks/use_find_rules_query';
import * as i18n from './translations';

/** Shorter words ("on", "an", "is") would make most sentences bold. */
const MIN_BOLD_WORD = 3;
/** Words that every rule has or that only frame the search ("rules that detect…"). */
const NOT_BOLD = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'which',
  'rule',
  'rules',
  'detect',
  'detects',
  'detection',
  'detections',
]);

/**
 * The words of the search text in bold where the sentence has them, only for reading: the match
 * is by meaning, so many sentences have no bold word.
 */
const withSearchWords = (text: string, search: string) => {
  const words = search
    .split(/\s+/)
    .filter((word) => word.length >= MIN_BOLD_WORD && !NOT_BOLD.has(word.toLowerCase()))
    .map(escapeRegExp);
  if (!words.length) return text;
  const parts = text.split(new RegExp(`\\b(${words.join('|')})`, 'gi'));
  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
};

/** Under a rule of the AI search results, across the table: why the rule matched. */
export const WhyMatchedRow = ({
  highlight,
  search,
}: {
  highlight: SearchHighlight;
  search: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="xs"
      data-test-subj="ruleSearchSnippet"
      css={css`
        min-inline-size: 0;
        /* Leave room for the expanded row's checkbox offset and cell padding. */
        max-inline-size: calc(100cqi - ${euiTheme.size.xl} - 2 * ${euiTheme.size.s});
        white-space: normal;
        overflow-wrap: anywhere;
      `}
    >
      {withSearchWords(highlight.text, search)}{' '}
      <span
        css={css`
          color: ${euiTheme.colors.textSubdued};
          white-space: nowrap;
        `}
      >
        {'· '}
        {i18n.SNIPPET_SOURCE[highlight.source] ?? highlight.source}
      </span>
    </EuiText>
  );
};
