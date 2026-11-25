/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import type { RuleSearchBoxMode } from '../../rule_management/logic/types';
import type { RuleSearchStatus } from './use_rule_search_status';
import * as i18n from './translations';

const aiHint = (status: RuleSearchStatus) =>
  status === 'off'
    ? i18n.AI_OFF_HINT
    : status === 'indexing'
    ? i18n.AI_INDEXING_HINT
    : i18n.AI_HINT;

/** AI | Keyword in front of the rules search box; AI is disabled until it is ready in the space. */
export const SearchModeSwitch = ({
  status,
  mode,
  onChange,
}: {
  status: RuleSearchStatus;
  mode: RuleSearchBoxMode;
  onChange: (mode: RuleSearchBoxMode) => void;
}) => {
  const options = useMemo(
    () => [
      {
        id: 'ai',
        label: i18n.MODE_AI,
        iconType: 'sparkles',
        isDisabled: status !== 'ready',
        toolTipContent: aiHint(status),
        'data-test-subj': 'ruleSearchModeAi',
      },
      {
        id: 'keyword',
        label: i18n.MODE_KEYWORD,
        toolTipContent: i18n.KEYWORD_HINT,
        'data-test-subj': 'ruleSearchModeKeyword',
      },
    ],
    [status]
  );
  return (
    <EuiButtonGroup
      legend={i18n.MODE_LEGEND}
      options={options}
      idSelected={mode}
      onChange={(id) => onChange(id as RuleSearchBoxMode)}
      buttonSize="compressed"
      data-test-subj="ruleSearchModeSwitch"
    />
  );
};
