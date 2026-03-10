/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeDocuments } from './analyze_documents';

describe('analyzeDocuments', () => {
  it('should handle zero input', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 0 });

    expect(result).toEqual({
      uniqueEventsCount: 0,
      uniqueAlertsCount: 0,
      isSingleAlert: false,
      isSingleEvent: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
    });
  });

  it('should identify single event', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 0 });

    expect(result.isSingleEvent).toBe(true);
    expect(result.uniqueEventsCount).toBe(1);
    expect(result.uniqueAlertsCount).toBe(0);
  });

  it('should identify single alert', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 1 });

    expect(result.isSingleAlert).toBe(true);
    expect(result.uniqueEventsCount).toBe(0);
    expect(result.uniqueAlertsCount).toBe(1);
  });

  it('should identify group of events', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 2, uniqueAlertsCount: 0 });

    expect(result.isGroupOfEvents).toBe(true);
    expect(result.uniqueEventsCount).toBe(2);
    expect(result.uniqueAlertsCount).toBe(0);
  });

  it('should identify group of alerts', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 2 });

    expect(result.isGroupOfAlerts).toBe(true);
    expect(result.uniqueEventsCount).toBe(0);
    expect(result.uniqueAlertsCount).toBe(2);
  });

  it('should identify group of events and alerts', () => {
    const result = analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 1 });

    expect(result.isGroupOfEventsAndAlerts).toBe(true);
    expect(result.uniqueEventsCount).toBe(1);
    expect(result.uniqueAlertsCount).toBe(1);
  });
});
