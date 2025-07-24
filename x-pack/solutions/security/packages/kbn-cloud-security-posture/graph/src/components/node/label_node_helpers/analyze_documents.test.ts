/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeDocuments, getLabelBackgroundColor, getLabelTextColor } from './analyze_documents';
import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';

describe('analyzeDocuments', () => {
  it('should handle empty or undefined documents', () => {
    const result = analyzeDocuments();
    
    expect(result).toEqual({
      totalEvents: 0,
      totalAlerts: 0,
      totalDocuments: 0,
      isSingleAlert: false,
      isSingleEvent: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
      eventDocuments: [],
      alertDocuments: [],
    });
  });

  it('should identify single event', () => {
    const docs: NodeDocumentDataModel[] = [
      { id: 'event1', type: 'event' },
    ];
    
    const result = analyzeDocuments(docs);
    
    expect(result.isSingleEvent).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.totalAlerts).toBe(0);
  });

  it('should identify single alert', () => {
    const docs: NodeDocumentDataModel[] = [
      { id: 'alert1', type: 'alert' },
    ];
    
    const result = analyzeDocuments(docs);
    
    expect(result.isSingleAlert).toBe(true);
    expect(result.totalEvents).toBe(0);
    expect(result.totalAlerts).toBe(1);
  });

  it('should identify group of events', () => {
    const docs: NodeDocumentDataModel[] = [
      { id: 'event1', type: 'event' },
      { id: 'event2', type: 'event' },
    ];
    
    const result = analyzeDocuments(docs);
    
    expect(result.isGroupOfEvents).toBe(true);
    expect(result.totalEvents).toBe(2);
    expect(result.totalAlerts).toBe(0);
  });

  it('should identify group of alerts', () => {
    const docs: NodeDocumentDataModel[] = [
      { id: 'alert1', type: 'alert' },
      { id: 'alert2', type: 'alert' },
    ];
    
    const result = analyzeDocuments(docs);
    
    expect(result.isGroupOfAlerts).toBe(true);
    expect(result.totalEvents).toBe(0);
    expect(result.totalAlerts).toBe(2);
  });

  it('should identify group of events and alerts', () => {
    const docs: NodeDocumentDataModel[] = [
      { id: 'event1', type: 'event' },
      { id: 'alert1', type: 'alert' },
    ];
    
    const result = analyzeDocuments(docs);
    
    expect(result.isGroupOfEventsAndAlerts).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.totalAlerts).toBe(1);
  });
});

describe('getLabelBackgroundColor', () => {
  const mockEuiTheme = {
    colors: {
      danger: '#FF0000',
      backgroundBasePrimary: '#0000FF',
    },
  };

  it('should return danger color for alerts', () => {
    const analysis = {
      totalAlerts: 1,
      totalEvents: 0,
    } as any;
    
    const result = getLabelBackgroundColor(analysis, mockEuiTheme);
    expect(result).toBe('#FF0000');
  });

  it('should return backgroundBasePrimary for events only', () => {
    const analysis = {
      totalAlerts: 0,
      totalEvents: 1,
    } as any;
    
    const result = getLabelBackgroundColor(analysis, mockEuiTheme);
    expect(result).toBe('#0000FF');
  });

  it('should return danger color when both alerts and events exist', () => {
    const analysis = {
      totalAlerts: 1,
      totalEvents: 1,
    } as any;
    
    const result = getLabelBackgroundColor(analysis, mockEuiTheme);
    expect(result).toBe('#FF0000');
  });
});

describe('getLabelTextColor', () => {
  const mockEuiTheme = {
    colors: {
      backgroundBasePlain: '#FFFFFF',
      textPrimary: '#000000',
    },
  };

  it('should return backgroundBasePlain color for alerts', () => {
    const analysis = {
      totalAlerts: 1,
      totalEvents: 0,
    } as any;
    
    const result = getLabelTextColor(analysis, mockEuiTheme);
    expect(result).toBe('#FFFFFF');
  });

  it('should return textPrimary for events only', () => {
    const analysis = {
      totalAlerts: 0,
      totalEvents: 1,
    } as any;
    
    const result = getLabelTextColor(analysis, mockEuiTheme);
    expect(result).toBe('#000000');
  });

  it('should return backgroundBasePlain color when both alerts and events exist', () => {
    const analysis = {
      totalAlerts: 1,
      totalEvents: 1,
    } as any;
    
    const result = getLabelTextColor(analysis, mockEuiTheme);
    expect(result).toBe('#FFFFFF');
  });
});