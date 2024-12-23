/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs', () => ({ readFileSync: jest.fn() }));
import { readFileSync } from 'fs';

import http from 'http';
import https from 'https';

import { ConfigType } from '..';

import { entSearchHttpAgent } from './enterprise_search_http_agent';

describe('entSearchHttpAgent', () => {
  describe('initializeHttpAgent', () => {
    it('creates an https.Agent when host URL is using HTTPS', () => {
      entSearchHttpAgent.initializeHttpAgent({
        host: 'https://example.org',
        ssl: {},
      } as ConfigType);
      expect(entSearchHttpAgent.getHttpAgent()).toBeInstanceOf(https.Agent);
    });

    it('creates an http.Agent when host URL is using HTTP', () => {
      entSearchHttpAgent.initializeHttpAgent({
        host: 'http://example.org',
        ssl: {},
      } as ConfigType);
      expect(entSearchHttpAgent.getHttpAgent()).toBeInstanceOf(http.Agent);
    });

    describe('fallbacks', () => {
      it('initializes a http.Agent when host URL is invalid', () => {
        entSearchHttpAgent.initializeHttpAgent({
          host: '##!notarealurl#$',
          ssl: {},
        } as ConfigType);
        expect(entSearchHttpAgent.getHttpAgent()).toBeInstanceOf(http.Agent);
      });

      it('should be an http.Agent when host URL is empty', () => {
        entSearchHttpAgent.initializeHttpAgent({
          host: undefined,
          ssl: {},
        } as ConfigType);
        expect(entSearchHttpAgent.getHttpAgent()).toBeInstanceOf(http.Agent);
      });
    });
  });

  describe('loadCertificateAuthorities', () => {
    describe('happy path', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (readFileSync as jest.Mock).mockImplementation((path: string) => `content-of-${path}`);
      });

      it('reads certificate authorities when ssl.certificateAuthorities is a string', () => {
        const certs = entSearchHttpAgent.loadCertificateAuthorities('some-path');
        expect(readFileSync).toHaveBeenCalledTimes(1);
        expect(certs).toEqual(['content-of-some-path']);
      });

      it('reads certificate authorities when ssl.certificateAuthorities is an array', () => {
        const certs = entSearchHttpAgent.loadCertificateAuthorities(['some-path', 'another-path']);
        expect(readFileSync).toHaveBeenCalledTimes(2);
        expect(certs).toEqual(['content-of-some-path', 'content-of-another-path']);
      });

      it('does not read anything when ssl.certificateAuthorities is empty', () => {
        const certs = entSearchHttpAgent.loadCertificateAuthorities(undefined);
        expect(readFileSync).toHaveBeenCalledTimes(0);
        expect(certs).toEqual([]);
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        const realFs = jest.requireActual('fs');
        (readFileSync as jest.Mock).mockImplementation((path: string) => realFs.readFileSync(path));
      });

      it('throws if certificateAuthorities is invalid', () => {
        expect(() => entSearchHttpAgent.loadCertificateAuthorities('/invalid/ca')).toThrow(
          "ENOENT: no such file or directory, open '/invalid/ca'"
        );
      });
    });
  });

  describe('getAgentOptions', () => {
    it('verificationMode: none', () => {
      expect(entSearchHttpAgent.getAgentOptions('none')).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('verificationMode: certificate', () => {
      expect(entSearchHttpAgent.getAgentOptions('certificate')).toEqual({
        rejectUnauthorized: true,
        checkServerIdentity: expect.any(Function),
      });

      const { checkServerIdentity } = entSearchHttpAgent.getAgentOptions('certificate') as any;
      expect(checkServerIdentity()).toEqual(undefined);
    });

    it('verificationMode: full', () => {
      expect(entSearchHttpAgent.getAgentOptions('full')).toEqual({
        rejectUnauthorized: true,
      });
    });
  });
});
