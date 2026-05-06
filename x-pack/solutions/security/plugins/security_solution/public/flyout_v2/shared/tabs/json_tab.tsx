/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { JsonTab as BaseJsonTab } from '../../../flyout/shared/components/json_tab';
import { FlyoutError } from '../components/flyout_error';

export interface JsonTabProps {
  value: Record<string, unknown>;
  'data-test-subj': string;
  isEmpty?: boolean;
}

export const JsonTab = memo(
  ({ value, 'data-test-subj': dataTestSubj, isEmpty = false }: JsonTabProps) => {
    if (isEmpty) return <FlyoutError />;
    return <BaseJsonTab value={value} showFooterOffset={false} data-test-subj={dataTestSubj} />;
  }
);

JsonTab.displayName = 'JsonTab';
