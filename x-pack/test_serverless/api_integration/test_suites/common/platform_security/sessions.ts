/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('security/sessions', function () {
    before(async () => {
      supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'viewer',
        {
          useCookieHeader: true,
        }
      );
    });

    describe('route access', () => {
      describe('internal', () => {
        it('get session info', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestViewerWithCookieCredentials
            .get('/internal/security/session')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestViewerWithCookieCredentials
            .get('/internal/security/session')
            .set(samlAuth.getInternalRequestHeader()));
          // expect 200 because there is a session
          expect(status).toBe(200);
        });

        it('extend', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestViewerWithCookieCredentials
            .post('/internal/security/session')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestViewerWithCookieCredentials
            .post('/internal/security/session')
            .set(samlAuth.getInternalRequestHeader()));
          // expect redirect
          expect(status).toBe(302);
        });

        it('invalidate', async () => {
          const supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
            useCookieHeader: true,
          });

          let body: any;
          let status: number;

          ({ body, status } = await supertestViewerWithCookieCredentials
            .post('/api/security/session/_invalidate')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestViewerWithCookieCredentials
            .post('/api/security/session/_invalidate')
            .set(samlAuth.getInternalRequestHeader()));
          // expect forbidden because the viewer does not have privilege to invalidate a session
          expect(status).toBe(403);

          ({ body, status } = await supertestAdmin
            .post('/api/security/session/_invalidate')
            .set(samlAuth.getInternalRequestHeader()));
          // expect 400 due to no body, admin has privilege, but the request body is missing
          expect(status).toBe(400);
          expect(body).toEqual({
            error: 'Bad Request',
            message: '[request body]: expected a plain object value, but found [null] instead.',
            statusCode: 400,
          });
        });
      });
    });
  });
}
