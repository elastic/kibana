/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StoryEventType } from '../../../../../common/entity_analytics/executive_brief/types';
import { EVENT_ICON } from './storyline_steps';

// EUI's icon map ships without type declarations; type the one export the test needs.
const { typeToPathMap } = jest.requireActual<{ typeToPathMap: Record<string, unknown> }>(
  '@elastic/eui/lib/components/icon/icon_map'
);

describe('storyline step icons', () => {
  const eventTypes: StoryEventType[] = [
    'alert_first',
    'ad_generated',
    'lead_created',
    'risk_jump',
    'relationship_first_seen',
    'case_opened',
    'case_status',
    'alerts_closed',
  ];

  it.each(eventTypes)('maps %s to an icon that exists in EUI', (type) => {
    expect(Object.keys(typeToPathMap)).toContain(EVENT_ICON[type].iconType);
  });

  it('covers every event type', () => {
    expect(Object.keys(EVENT_ICON).sort()).toEqual([...eventTypes].sort());
  });
});
