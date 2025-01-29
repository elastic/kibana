/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Index } from '@kbn/index-management-shared-types';

import { EuiI18nNumber, useEuiTheme } from '@elastic/eui';

import { QuickStat } from './quick_stat';
import {
  DOCUMENT_COUNT_LABEL,
  DOCUMENT_COUNT_TOOLTIP,
  INDEX_SIZE_LABEL,
  TOTAL_COUNT_LABEL,
} from './constants';

export interface StatelessDocumentCountStatProps {
  index: Index;
  documentCount: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StatelessDocumentCountStat = ({
  index,
  documentCount,
  open,
  setOpen,
}: StatelessDocumentCountStatProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="documents"
      iconColor={euiTheme.colors.fullShade}
      title={DOCUMENT_COUNT_LABEL}
      data-test-subj="QuickStatsDocumentCount"
      secondaryTitle={<EuiI18nNumber value={documentCount} />}
      stats={[
        {
          title: TOTAL_COUNT_LABEL,
          description: <EuiI18nNumber value={documentCount} />,
        },
        {
          title: INDEX_SIZE_LABEL,
          description: index.size ?? '0b',
        },
      ]}
      tooltipContent={DOCUMENT_COUNT_TOOLTIP}
    />
  );
};
