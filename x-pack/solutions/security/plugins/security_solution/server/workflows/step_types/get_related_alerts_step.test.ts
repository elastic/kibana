/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRelatedAlertsInputSchema } from './get_related_alerts_step';

describe('getRelatedAlerts step input schema', () => {
  it('coerces numeric strings and applies defaults', () => {
    const parsed = getRelatedAlertsInputSchema.parse({
      alertId: 'abc',
      alertIndex: '.internal.alerts-security.alerts-default-000001',
      max_alerts: '20',
      page_size: '200',
    });

    expect(parsed.max_alerts).toBe(20);
    expect(parsed.page_size).toBe(200);
    // defaulted fields are present and typed
    expect(typeof parsed.max_terms_per_query).toBe('number');
    expect(typeof parsed.max_entities_per_field).toBe('number');
  });

  it('rejects NaN/Infinity so downstream queries cannot emit empty terms', () => {
    const badNaN = getRelatedAlertsInputSchema.safeParse({
      alertId: 'abc',
      alertIndex: '.internal.alerts-security.alerts-default-000001',
      max_terms_per_query: NaN,
    });
    expect(badNaN.success).toBe(false);

    const badInfinity = getRelatedAlertsInputSchema.safeParse({
      alertId: 'abc',
      alertIndex: '.internal.alerts-security.alerts-default-000001',
      page_size: Infinity,
    });
    expect(badInfinity.success).toBe(false);
  });
});

