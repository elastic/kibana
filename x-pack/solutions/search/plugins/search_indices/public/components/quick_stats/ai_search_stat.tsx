/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SetupAISearchButton } from './setup_ai_search_button';
import { VectorFieldTypes } from './mappings_convertor';
import { QuickStat } from './quick_stat';

export interface AISearchQuickStatProps {
  mappingStats: VectorFieldTypes;
  vectorFieldCount: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AISearchQuickStat = ({
  mappingStats,
  vectorFieldCount,
  open,
  setOpen,
}: AISearchQuickStatProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="sparkles"
      iconColor={euiTheme.colors.fullShade}
      title={i18n.translate('xpack.searchIndices.quickStats.ai_search_heading', {
        defaultMessage: 'AI Search',
      })}
      data-test-subj="QuickStatsAIMappings"
      secondaryTitle={
        vectorFieldCount > 0
          ? i18n.translate('xpack.searchIndices.quickStats.total_count', {
              defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
              values: {
                value: vectorFieldCount,
              },
            })
          : i18n.translate('xpack.searchIndices.quickStats.no_vector_fields', {
              defaultMessage: 'Not configured',
            })
      }
      content={vectorFieldCount === 0 ? <SetupAISearchButton /> : undefined}
      stats={[
        {
          title: i18n.translate('xpack.searchIndices.quickStats.sparse_vector', {
            defaultMessage: 'Sparse Vector',
          }),
          description: i18n.translate('xpack.searchIndices.quickStats.sparse_vector_count', {
            defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
            values: { value: mappingStats.sparse_vector },
          }),
        },
        {
          title: i18n.translate('xpack.searchIndices.quickStats.dense_vector', {
            defaultMessage: 'Dense Vector',
          }),
          description: i18n.translate('xpack.searchIndices.quickStats.dense_vector_count', {
            defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
            values: { value: mappingStats.dense_vector },
          }),
        },
        {
          title: i18n.translate('xpack.searchIndices.quickStats.semantic_text', {
            defaultMessage: 'Semantic Text',
          }),
          description: i18n.translate('xpack.searchIndices.quickStats.semantic_text_count', {
            defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
            values: { value: mappingStats.semantic_text },
          }),
        },
      ]}
    />
  );
};
