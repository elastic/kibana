/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import * as i18n from './translations';

interface EventMessageFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventMessageFilter({ value, onChange }: EventMessageFilterProps): JSX.Element {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  );

  return (
    <EuiFieldSearch
      aria-label={i18n.SEARCH_BY_EVENT_MESSAGE_ARIA_LABEL}
      fullWidth
      incremental={false}
      placeholder={i18n.SEARCH_BY_EVENT_MESSAGE_PLACEHOLDER}
      value={value}
      onChange={handleChange}
      data-test-subj="ruleEventLogMessageSearchField"
    />
  );
}
