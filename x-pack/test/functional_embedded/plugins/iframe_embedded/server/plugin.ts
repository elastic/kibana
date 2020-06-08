/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Url from 'url';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { kbnTestConfig } from '@kbn/test';

function renderBody(iframeUrl: string = 'https://localhost:5601') {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Kibana embedded in iframe</title>
  </head>
  <body>
    <iframe data-test-subj="iframe_embedded" width="1000" height="1200" src="${iframeUrl}" frameborder="0"/>
  </body>
</html>
`;
}
export class IframeEmbeddedPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/iframe_embedded',
        validate: false,
      },
      async (context, request, response) => {
        const { protocol, hostname, port } = kbnTestConfig.getUrlParts();
        const kibanaUrl = Url.format({ protocol, hostname, port });
        return response.ok({
          body: renderBody(kibanaUrl),
          headers: {
            'content-type': 'text/html',
          },
        });
      }
    );
  }
  public start() {}
  public stop() {}
}
