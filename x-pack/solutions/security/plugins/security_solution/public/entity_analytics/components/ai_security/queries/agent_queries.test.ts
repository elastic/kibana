/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_OPEN_STATUS_FILTER } from '../../home/entities_grid/queries/alerts';
import { buildAgentAlertCountsQuery, buildAgentAlertsQuery } from './agent_queries';

describe('agent alert queries', () => {
  it('reads only open alerts for the flyout, with the filter the AI security table counts with', () => {
    const flyoutQuery = buildAgentAlertsQuery('default', 'ai_agent:claude_code@host-1@ec2-user');
    expect(buildAgentAlertCountsQuery('default')).toContain(ALERT_OPEN_STATUS_FILTER);
    expect(flyoutQuery).toContain(
      `MV_CONTAINS(kibana.alert.entity.id, "ai_agent:claude_code@host-1@ec2-user") AND (${ALERT_OPEN_STATUS_FILTER})`
    );
  });
});
