/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  impactEntityChildFlyoutProperties,
  impactEntityEngineType,
} from './impact_entity_child_flyout';

describe('impactEntityEngineType', () => {
  it('maps host, user, and service, and treats anything else as generic', () => {
    expect(impactEntityEngineType('Host')).toBe('host');
    expect(impactEntityEngineType('user')).toBe('user');
    expect(impactEntityEngineType('SERVICE')).toBe('service');
    expect(impactEntityEngineType(undefined)).toBe('generic');
    expect(impactEntityEngineType('container')).toBe('generic');
  });
});

describe('impactEntityChildFlyoutProperties', () => {
  const historyKey = Symbol.for('kibana.agenticInvestigations.investigationFlyout');

  it('inherits the investigation session and does not use a numeric size', () => {
    const properties = impactEntityChildFlyoutProperties(
      { id: 'host-1', name: 'web-01', type: 'host' },
      historyKey
    );

    expect(properties.session).toBe('inherit');
    expect(properties.historyKey).toBe(historyKey);
    expect(properties.type).toBe('overlay');
    expect(typeof properties.size).toBe('string');
    expect(properties.title).toContain('web-01');
  });
});
