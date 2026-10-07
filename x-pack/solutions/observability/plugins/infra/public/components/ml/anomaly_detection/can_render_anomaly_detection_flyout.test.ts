/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canRenderAnomalyDetectionFlyout } from './can_render_anomaly_detection_flyout';

describe('canRenderAnomalyDetectionFlyout', () => {
  it('requires both metrics indices and an active space', () => {
    expect(canRenderAnomalyDetectionFlyout({ indices: 'metrics-*' }, { id: 'default' })).toBe(true);
    expect(canRenderAnomalyDetectionFlyout(undefined, { id: 'default' })).toBe(false);
    expect(canRenderAnomalyDetectionFlyout({ indices: 'metrics-*' }, undefined)).toBe(false);
    expect(canRenderAnomalyDetectionFlyout({ indices: '' }, { id: 'default' })).toBe(false);
  });
});
