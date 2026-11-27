/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { RuleSearchBoxMode } from '../../rule_management/logic/types';
import type { RuleSearchStatus } from './use_rule_search_status';
import * as i18n from './translations';

const hint = (status: RuleSearchStatus, on: boolean) => {
  if (status === 'off') return i18n.AI_OFF_HINT;
  if (status === 'indexing') return i18n.AI_INDEXING_HINT;
  return on ? i18n.AI_ON_HINT : i18n.AI_OFF_BY_USER_HINT;
};

/**
 * One button in front of the rules search box: AI search on or off. Off is the keyword search of
 * Kibana. The placeholder and the line above the table also say which search runs.
 */
export const AiSearchToggle = ({
  status,
  mode,
  onChange,
}: {
  status: RuleSearchStatus;
  mode: RuleSearchBoxMode;
  onChange: (mode: RuleSearchBoxMode) => void;
}) => {
  const on = mode === 'ai';
  return (
    <EuiToolTip content={hint(status, on)} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="sparkles"
        display={on ? 'fill' : 'empty'}
        color={on ? 'primary' : 'text'}
        aria-pressed={on}
        aria-label={i18n.AI_SEARCH}
        isDisabled={status !== 'ready'}
        onClick={() => onChange(on ? 'keyword' : 'ai')}
        data-test-subj="ruleSearchAiToggle"
      />
    </EuiToolTip>
  );
};
