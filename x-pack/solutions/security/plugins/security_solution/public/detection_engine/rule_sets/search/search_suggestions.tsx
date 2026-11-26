/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiListGroup, EuiListGroupItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import * as i18n from './translations';

const MAX_RECENT = 5;

/** The last AI searches in this space, newest first. */
export const useRecentAiSearches = () => {
  const spaceId = useSpaceId();
  const [recent = [], setRecent] = useLocalStorage<string[]>(
    `securitySolution.rulesTable.recentAiSearches.${spaceId ?? 'default'}`,
    []
  );
  const remember = useCallback(
    (text: string) => setRecent([text, ...recent.filter((t) => t !== text)].slice(0, MAX_RECENT)),
    [recent, setRecent]
  );
  return { recent, remember };
};

/** Under the empty search box with AI search on: the recent searches and example descriptions. */
export const SearchSuggestions = ({
  recent,
  onPick,
}: {
  recent: string[];
  onPick: (text: string) => void;
}) => (
  <div data-test-subj="ruleSearchSuggestions">
    {recent.length > 0 && (
      <>
        <EuiTitle size="xxxs">
          <h4>{i18n.RECENT_SEARCHES}</h4>
        </EuiTitle>
        <EuiListGroup bordered={false}>
          {recent.map((text) => (
            <EuiListGroupItem
              key={text}
              label={text}
              iconType="clock"
              onClick={() => onPick(text)}
              data-test-subj="ruleSearchRecent"
            />
          ))}
        </EuiListGroup>
        <EuiSpacer size="s" />
      </>
    )}
    <EuiTitle size="xxxs">
      <h4>{i18n.TRY_EXAMPLES}</h4>
    </EuiTitle>
    <EuiListGroup bordered={false}>
      {i18n.EXAMPLE_QUERIES.map((text) => (
        <EuiListGroupItem
          key={text}
          label={text}
          iconType="sparkles"
          onClick={() => onPick(text)}
          data-test-subj="ruleSearchSuggestionExample"
        />
      ))}
    </EuiListGroup>
  </div>
);
