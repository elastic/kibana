/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import {
  getSAMLResponse,
  getSAMLRequestId,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { PluginSetupDependencies } from '.';

export function initRoutes(
  pluginContext: PluginInitializerContext,
  core: CoreSetup,
  plugins: PluginSetupDependencies
) {
  const serverInfo = core.http.getServerInfo();
  core.http.resources.register(
    {
      path: '/saml_provider/login',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      const samlResponse = await getSAMLResponse({
        inResponseTo: await getSAMLRequestId(request.url.href!),
        destination: `${serverInfo.protocol}://${serverInfo.hostname}:${serverInfo.port}/api/security/saml/callback`,
      });

      return response.renderHtml({
        body: `
          <!DOCTYPE html>
          <title>Kibana SAML Login</title>
          <link rel="icon" href="data:,">
          <script defer src="/saml_provider/login/submit.js"></script>
          <body>
            <form id="loginForm" method="post" action="/api/security/saml/callback">
                <input name="SAMLResponse" type="hidden" value="${samlResponse}" />
            </form>
          </body>
        `,
      });
    }
  );

  core.http.resources.register(
    { path: '/saml_provider/login/submit.js', validate: false, options: { authRequired: false } },
    (context, request, response) => {
      return response.renderJs({ body: 'document.getElementById("loginForm").submit();' });
    }
  );

  core.http.resources.register(
    {
      path: '/saml_provider/logout',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.redirected({ headers: { location: '/logout?SAMLResponse=something' } });
    }
  );

  // [HACK]: On CI, Kibana runs Serverless functional tests against the production Kibana build but still relies on Mock
  // IdP for SAML authentication in tests. The Mock IdP SAML realm, in turn, is linked to a Mock IDP plugin in Kibana
  // that's only included in development mode and not available in the production Kibana build. Until our testing
  // framework can properly support all SAML flows, we should forward all relevant Mock IDP plugin endpoints to a logout
  // destination normally used in the Serverless setup.
  if (pluginContext.env.mode.prod) {
    core.http.resources.register(
      {
        path: '/mock_idp/login',
        validate: false,
        options: { authRequired: false },
      },
      async (context, request, response) => {
        return response.redirected({
          headers: { location: plugins.cloud?.projectsUrl ?? '/login' },
        });
      }
    );
  }

  let attemptsCounter = 0;
  core.http.resources.register(
    {
      path: '/saml_provider/never_login',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      return response.renderHtml({
        body: `
          <!DOCTYPE html>
          <title>Kibana SAML Login</title>
          <link rel="icon" href="data:,">
          <body data-test-subj="idp-page">
            <span>Attempt #${++attemptsCounter}</span>
          </body>
        `,
      });
    }
  );
}
