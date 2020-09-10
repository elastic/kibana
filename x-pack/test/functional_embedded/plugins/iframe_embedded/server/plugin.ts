/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Url from 'url';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';

function renderBody(iframeUrl: string) {
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
    core.http.resources.register(
      {
        path: '/iframe_embedded',
        validate: false,
      },
      async (context, request, response) => {
        const { protocol, port, hostname } = core.http.getServerInfo();

        const kibanaUrl = Url.format({ protocol, hostname, port });

        return response.renderHtml({
          body: renderBody(kibanaUrl),
        });
      }
    );
  }
  public start() {}
  public stop() {}
}
