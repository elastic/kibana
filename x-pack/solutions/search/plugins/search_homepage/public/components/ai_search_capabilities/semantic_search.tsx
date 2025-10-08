/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { AISearchWorkflow } from './ai_search_workflow';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export const SemanticSearch: React.FC = () => {
  const assetBasePath = useAssetBasePath();

  const semanticSearchText = {
    image: `${assetBasePath}/semantic_search.svg`,
    imageAlt: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch.imageAlt', {
      defaultMessage: 'Semantic search',
    }),
    heading: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch.title', {
      defaultMessage: 'Enhance search accuracy with advanced semantic capabilities.',
    }),
    subheading: i18n.translate(
      'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.description',
      {
        defaultMessage:
          'Leverage the semantic_text field and ELSER machine learning model for enhanced data analysis.',
      }
    ),
    featureBullets: [
      i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch.firstLine', {
        defaultMessage: 'Use Elastic’s inference service or connect your own model provider',
      }),
      i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch.SecondLine', {
        defaultMessage: 'Default chunking strategies or customize your own',
      }),
      i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch.ThirdLine', {
        defaultMessage: 'Combine semantic capabilities with traditional search methods.',
      }),
    ],
    buttonLabel: i18n.translate(
      'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.createSemanticOptimizedIndex',
      {
        defaultMessage: 'Create a semantic optimized index',
      }
    ),
    dataTestSubj: 'createSemanticOptimizedIndexButton',
    workflow: 'semantic',
  };

  return <AISearchWorkflow capability={semanticSearchText} />;
};
