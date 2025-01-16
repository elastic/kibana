/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Index } from '@kbn/index-management-shared-types';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { Mappings } from '../../types';
import { IndexDocuments } from '../../hooks/api/use_document_search';
import { AISearchQuickStat } from './ai_search_stat';
import { StatelessDocumentCountStat } from './stateless_document_cout_stat';

export interface QuickStatsProps {
  index: Index;
  mappings: Mappings;
  indexDocuments: IndexDocuments;
  tooltipContent?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ index, mappings, indexDocuments }) => {
  const [open, setOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const docCount = indexDocuments?.results._meta.page.total ?? 0;

  return (
    <EuiPanel
      paddingSize="none"
      data-test-subj="quickStats"
      hasShadow={false}
      css={() => ({
        border: euiTheme.border.thin,
        background: euiTheme.colors.lightestShade,
        overflow: 'hidden',
      })}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <StatelessDocumentCountStat
            euiTheme={euiTheme}
            index={index}
            documentCount={docCount}
            open={open}
            setOpen={setOpen}
            first
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AISearchQuickStat
            euiTheme={euiTheme}
            mappings={mappings}
            open={open}
            setOpen={setOpen}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
