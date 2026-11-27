/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../../../common/api/entity_analytics';
import type { AgentRow } from '../../../../entity_analytics/components/ai_security/types';

/** The fields of the agent's own record that `EntitySummaryGrid` reads: ID, data sources and watchlists. */
export const toSummaryRecord = (entityId: string, agent?: AgentRow): Entity => ({
  entity: {
    id: entityId,
    source: [...(agent?.dataSources ?? [])],
    attributes: { watchlists: [...(agent?.watchlistIds ?? [])] },
  },
});
