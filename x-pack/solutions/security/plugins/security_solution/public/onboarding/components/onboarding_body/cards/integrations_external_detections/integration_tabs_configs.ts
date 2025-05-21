/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATION_CARD_HEIGHT } from '../common/integrations/constants';
import { IntegrationTabId, type Tab } from '../../../../../common/lib/integrations/types';
import { FEATURED_INTEGRATION_SORT_ORDER } from '../../../../../common/lib/search_ai_lake/hooks/integrations/use_enhanced_integration_cards';

export const INTEGRATION_TABS: Tab[] = [
  {
    category: '',
    id: IntegrationTabId.recommendedSearchAILake,
    label: 'Recommended',
    overflow: 'hidden',
    showSearchTools: false,
    // Fleet has a default sorting for integrations by category that Security Solution does not want to apply
    // so we need to disable the sorting for the recommended tab to allow static ordering according to the featuredCardIds
    sortByFeaturedIntegrations: false,
    featuredCardIds: FEATURED_INTEGRATION_SORT_ORDER,
    height: `${INTEGRATION_CARD_HEIGHT * 1.8}px`,
  },
];
