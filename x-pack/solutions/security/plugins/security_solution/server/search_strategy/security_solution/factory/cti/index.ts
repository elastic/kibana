/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CtiQueries } from '../../../../../common/search_strategy/security_solution/cti';
import { eventEnrichment } from './event_enrichment';
import { dataSource } from './threat_intel_source';

export const ctiFactoryTypes = {
  [CtiQueries.eventEnrichment]: eventEnrichment,
  [CtiQueries.dataSource]: dataSource,
};
