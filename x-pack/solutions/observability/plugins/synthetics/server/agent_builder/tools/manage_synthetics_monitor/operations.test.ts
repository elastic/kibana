/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitorOperationSchema } from './operations';

describe('monitorOperationSchema', () => {
  describe('set_metadata', () => {
    it('accepts a valid set_metadata op', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_metadata',
        name: 'My monitor',
        tags: ['team-a', 'prod'],
        apm_service_name: 'my-service',
        namespace: 'default',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name (.min(1))', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_metadata',
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty tag entries', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_metadata',
        tags: ['', 'prod'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('set_schedule', () => {
    it('accepts an allow-listed minutes schedule', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_schedule',
        number: '5',
        unit: 'm',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an off-allow-list minutes schedule via .refine', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_schedule',
        number: '7',
        unit: 'm',
      });
      expect(result.success).toBe(false);
    });

    it('accepts seconds without enforcing the minute allow-list', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_schedule',
        number: '30',
        unit: 's',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('set_http_check', () => {
    it('accepts a https url with no extras', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts http (not just https)', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: 'http://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-http(s) url via .refine', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: 'ftp://example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an empty url', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: '',
      });
      expect(result.success).toBe(false);
    });

    it('accepts advanced fields (method, max_redirects, ignore_https_errors)', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: 'https://example.com',
        method: 'POST',
        max_redirects: 5,
        ignore_https_errors: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects an unsupported HTTP method', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_http_check',
        url: 'https://example.com',
        method: 'TRACE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('set_locations', () => {
    it('accepts a single Elastic-managed location', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_locations',
        locations: [
          {
            id: 'us_central',
            label: 'US Central',
            isServiceManaged: true,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a private location with agentPolicyId', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_locations',
        locations: [
          {
            id: 'pl-uuid',
            label: 'On-prem',
            isServiceManaged: false,
            agentPolicyId: 'agent-policy-uuid',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an empty locations array', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_locations',
        locations: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('set_enabled', () => {
    it('accepts true', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_enabled',
        enabled: true,
      });
      expect(result.success).toBe(true);
    });

    it('accepts false', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_enabled',
        enabled: false,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing enabled flag', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'set_enabled',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('discriminator', () => {
    it('rejects unknown operation names', () => {
      const result = monitorOperationSchema.safeParse({
        operation: 'unknown_op',
        url: 'https://example.com',
      });
      expect(result.success).toBe(false);
    });
  });
});
