/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Index } from '@kbn/index-management-shared-types';

import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { Mappings } from '../../types';
import { IndexDocuments } from '../../hooks/api/use_document_search';

import { AISearchQuickStat } from './ai_search_stat';
import { AliasesStat } from './aliases_quick_stat';
import { StatefulDocumentCountStat } from './stateful_document_count_stat';
import { StatefulIndexStorageStat } from './stateful_storage_stat';
import { IndexStatusStat } from './index_status_stat';
import { QuickStatsContainer } from './quick_stats_container';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';
import { StatelessDocumentCountStat } from './stateless_document_cout_stat';
import { StatelessQuickStats } from './stateless_quick_stats';
import { QuickStatsPanelStyle } from './styles';

export interface QuickStatsProps {
  index: Index;
  mappings: Mappings;
  indexDocuments: IndexDocuments;
  tooltipContent?: string;
  isStateless: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  index,
  mappings,
  indexDocuments,
  isStateless,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const { mappingStats, vectorFieldCount } = useMemo(() => {
    const stats = countVectorBasedTypesFromMappings(mappings);
    const vectorFields = stats.sparse_vector + stats.dense_vector + stats.semantic_text;
    return { mappingStats: stats, vectorFieldCount: vectorFields };
  }, [mappings]);

  const stats = isStateless
    ? [
        <StatelessDocumentCountStat
          index={index}
          documentCount={indexDocuments?.results._meta.page.total ?? 0}
          open={open}
          setOpen={setOpen}
        />,
        ...(Array.isArray(index.aliases) && index.aliases.length > 0
          ? [<AliasesStat aliases={index.aliases} open={open} setOpen={setOpen} />]
          : []),
        <AISearchQuickStat
          mappingStats={mappingStats}
          vectorFieldCount={vectorFieldCount}
          open={open}
          setOpen={setOpen}
        />,
      ]
    : [
        <IndexStatusStat index={index} open={open} setOpen={setOpen} />,
        <StatefulIndexStorageStat index={index} open={open} setOpen={setOpen} />,
        <StatefulDocumentCountStat
          open={open}
          setOpen={setOpen}
          index={index}
          mappingStats={mappingStats}
        />,
        ...(Array.isArray(index.aliases) && index.aliases.length > 0
          ? [<AliasesStat aliases={index.aliases} open={open} setOpen={setOpen} />]
          : []),
        <AISearchQuickStat
          mappingStats={mappingStats}
          vectorFieldCount={vectorFieldCount}
          open={open}
          setOpen={setOpen}
        />,
      ];

  return (
    <EuiPanel
      paddingSize="none"
      data-test-subj="quickStats"
      hasShadow={false}
      css={QuickStatsPanelStyle(euiTheme)}
    >
      {isStateless ? (
        <StatelessQuickStats>{stats}</StatelessQuickStats>
      ) : (
        <QuickStatsContainer>{stats}</QuickStatsContainer>
      )}
    </EuiPanel>
  );
};
