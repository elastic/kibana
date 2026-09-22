/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate as isUuid } from 'uuid';
import { buildHuntInvestigationConversationId } from './hunt_investigation_id';

describe('buildHuntInvestigationConversationId', () => {
  it('derives the same id for the same report every time, so the Worker and the routes agree', () => {
    expect(buildHuntInvestigationConversationId('rpt-001')).toBe(
      buildHuntInvestigationConversationId('rpt-001')
    );
  });

  it('derives different ids for different reports', () => {
    expect(buildHuntInvestigationConversationId('rpt-001')).not.toBe(
      buildHuntInvestigationConversationId('rpt-002')
    );
  });

  it('produces a valid uuid', () => {
    expect(isUuid(buildHuntInvestigationConversationId('rpt-001'))).toBe(true);
  });
});
