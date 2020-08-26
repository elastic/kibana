/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from '../../../../../../src/core/server';
import { getSAMLResponse, getSAMLRequestId } from '../../saml_tools';

export function initRoutes(core: CoreSetup) {
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
}
