/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeDocuments } from './analyze_documents';

describe('analyzeDocuments', () => {
  it('should handle zero input', () => {
    const result = analyzeDocuments({ eventsCount: 0, alertsCount: 0 });

    expect(result).toEqual({
      eventsCount: 0,
      alertsCount: 0,
      isSingleAlert: false,
      isSingleEvent: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
    });
  });

  it('should identify single event', () => {
    const result = analyzeDocuments({ eventsCount: 1, alertsCount: 0 });

    expect(result.isSingleEvent).toBe(true);
    expect(result.eventsCount).toBe(1);
    expect(result.alertsCount).toBe(0);
  });

  it('should identify single alert', () => {
    const result = analyzeDocuments({ eventsCount: 0, alertsCount: 1 });

    expect(result.isSingleAlert).toBe(true);
    expect(result.eventsCount).toBe(0);
    expect(result.alertsCount).toBe(1);
  });

  it('should identify group of events', () => {
    const result = analyzeDocuments({ eventsCount: 2, alertsCount: 0 });

    expect(result.isGroupOfEvents).toBe(true);
    expect(result.eventsCount).toBe(2);
    expect(result.alertsCount).toBe(0);
  });

  it('should identify group of alerts', () => {
    const result = analyzeDocuments({ eventsCount: 0, alertsCount: 2 });

    expect(result.isGroupOfAlerts).toBe(true);
    expect(result.eventsCount).toBe(0);
    expect(result.alertsCount).toBe(2);
  });

  it('should identify group of events and alerts', () => {
    const result = analyzeDocuments({ eventsCount: 1, alertsCount: 1 });

    expect(result.isGroupOfEventsAndAlerts).toBe(true);
    expect(result.eventsCount).toBe(1);
    expect(result.alertsCount).toBe(1);
  });
});
