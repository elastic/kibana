/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { authenticationStrategy, buildAuthenticationNarrative } from './authentication_strategy';

describe('authenticationStrategy', () => {
  describe('match', () => {
    it('returns true for authentication category', () => {
      expect(authenticationStrategy.match({ event: { category: ['authentication'] } })).toBe(
        true
      );
    });

    it('returns true for endpoint security dataset', () => {
      expect(
        authenticationStrategy.match({ event: { dataset: ['endpoint.events.security'] } })
      ).toBe(true);
    });

    it('returns false for process events', () => {
      expect(authenticationStrategy.match({ event: { category: ['process'] } })).toBe(false);
    });
  });

  describe('buildAuthenticationNarrative', () => {
    it('builds a logon success narrative', () => {
      const text = buildAuthenticationNarrative({
        event: { category: ['authentication'], action: ['user_logon'], outcome: ['success'] },
        user: { name: ['admin'] },
        host: { name: ['dc-01'] },
        source: { ip: ['192.168.1.100'], as: { organization: { name: ['Corp Network'] } } },
        process: { name: ['sshd'] },
        kibana: {
          alert: { severity: ['medium'], rule: { name: ['Unusual Login Activity'] } },
        },
      });

      expect(text).toBe(
        'Authentication logon success by admin on dc-01 from 192.168.1.100 (Corp Network) via sshd created medium alert Unusual Login Activity.'
      );
    });

    it('builds a logoff narrative', () => {
      expect(
        buildAuthenticationNarrative({
          event: { category: ['authentication'], action: ['user_logoff'] },
          user: { name: ['bob'] },
          host: { name: ['host-1'] },
        })
      ).toBe('Authentication logoff by bob on host-1');
    });

    it('builds a generic auth event', () => {
      const text = buildAuthenticationNarrative({
        event: {
          category: ['authentication'],
          action: ['kerberos_ticket_request'],
          outcome: ['failure'],
        },
        user: { name: ['svc-account'] },
        host: { name: ['dc-02'] },
        kibana: { alert: { severity: ['high'], rule: { name: ['Kerberoasting'] } } },
      });

      expect(text).toBe(
        'Authentication event kerberos_ticket_request (failure) by svc-account on dc-02 created high alert Kerberoasting.'
      );
    });

    it('handles minimal auth data', () => {
      expect(
        buildAuthenticationNarrative({ event: { category: ['authentication'] } })
      ).toBe('Authentication event');
    });
  });
});
