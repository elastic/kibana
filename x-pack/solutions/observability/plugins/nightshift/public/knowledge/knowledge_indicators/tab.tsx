/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DateRangeRedirect } from '../../components/date_range_redirect';
import { KnowledgeIndicatorsTable } from './knowledge_indicators_table';

export const KnowledgeIndicatorsTab = (): React.ReactElement => (
  <DateRangeRedirect>
    <KnowledgeIndicatorsTable />
  </DateRangeRedirect>
);
