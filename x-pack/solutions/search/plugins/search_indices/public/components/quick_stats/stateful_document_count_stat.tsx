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
  DELETED_COUNT_LABEL,
  DOCUMENT_COUNT_LABEL,
  DOCUMENT_COUNT_TOOLTIP,
  TOTAL_COUNT_LABEL,
} from './constants';
import { VectorFieldTypes } from './mappings_convertor';

export interface StatefulDocumentCountStatProps {
  index: Index;
  mappingStats: VectorFieldTypes;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StatefulDocumentCountStat = ({
  index,
  open,
  setOpen,
  mappingStats,
}: StatefulDocumentCountStatProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="documents"
      iconColor={euiTheme.colors.fullShade}
      title={DOCUMENT_COUNT_LABEL}
      data-test-subj="QuickStatsDocumentCount"
      secondaryTitle={<EuiI18nNumber value={index.documents ?? 0} />}
      stats={[
        {
          title: TOTAL_COUNT_LABEL,
          description: <EuiI18nNumber value={index.documents ?? 0} />,
        },
        {
          title: DELETED_COUNT_LABEL,
          description: <EuiI18nNumber value={index.documents_deleted ?? 0} />,
        },
      ]}
      tooltipContent={mappingStats.semantic_text > 0 ? DOCUMENT_COUNT_TOOLTIP : undefined}
    />
  );
};
