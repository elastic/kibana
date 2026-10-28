/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate as isUuid } from 'uuid';
import { buildHuntInvestigationConversationId } from './hunt_investigation_id';

describe('buildHuntInvestigationConversationId', () => {
  const spaceId = 'default';

  it('derives the same id for the same report every time, so the Worker and the routes agree', () => {
    expect(buildHuntInvestigationConversationId({ spaceId, reportId: 'rpt-001' })).toBe(
      buildHuntInvestigationConversationId({ spaceId, reportId: 'rpt-001' })
    );
  });

  it('derives different ids for different reports', () => {
    expect(buildHuntInvestigationConversationId({ spaceId, reportId: 'rpt-001' })).not.toBe(
      buildHuntInvestigationConversationId({ spaceId, reportId: 'rpt-002' })
    );
  });

  it('derives different ids for the same report in different spaces', () => {
    // Conversations share one index keyed by this id, so two spaces hunting the same global
    // report must not ask for the same id.
    expect(
      buildHuntInvestigationConversationId({ spaceId: 'hunt-a', reportId: 'rpt-001' })
    ).not.toBe(buildHuntInvestigationConversationId({ spaceId: 'hunt-b', reportId: 'rpt-001' }));
  });

  it('produces a valid uuid', () => {
    expect(isUuid(buildHuntInvestigationConversationId({ spaceId, reportId: 'rpt-001' }))).toBe(
      true
    );
  });
});
