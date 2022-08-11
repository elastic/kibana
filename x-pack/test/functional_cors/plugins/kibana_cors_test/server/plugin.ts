/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Hapi from '@hapi/hapi';
import { kbnTestConfig } from '@kbn/test';
import Url from 'url';
import abab from 'abab';

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';

const apiToken = abab.btoa(kbnTestConfig.getUrlParts().auth!);

function renderBody(kibanaUrl: string) {
  const url = Url.resolve(kibanaUrl, '/cors-test');
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Request to CORS Kibana</title>
  </head>
  <script>
fetch('${url}', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ${apiToken}',
    'kbn-xsrf': 'kibana',
  },
  credentials: 'include',
})
  .then((res) => res.text())
  .then((res) => {
    const element = window.document.createElement('p');
    element.innerText = res;
    window.document.body.appendChild(element);
  });
  </script>
</html>
`;
}

export class CorsTestPlugin implements Plugin {
  private server?: Hapi.Server;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.post({ path: '/cors-test', validate: false }, (context, req, res) =>
      res.ok({ body: 'content from kibana' })
    );
  }

  start(core: CoreStart) {
    const config = this.initializerContext.config.get<ConfigSchema>();

    const server = new Hapi.Server({
      port: config.port,
    });
    this.server = server;

    const { protocol, port, hostname } = core.http.getServerInfo();

    const kibanaUrl = Url.format({ protocol, hostname, port });

    server.route({
      path: '/',
      method: 'GET',
      handler(_, h) {
        return h.response(renderBody(kibanaUrl));
      },
    });
    server.start();
  }

  public stop() {
    if (this.server) {
      this.server.stop();
    }
  }
}
