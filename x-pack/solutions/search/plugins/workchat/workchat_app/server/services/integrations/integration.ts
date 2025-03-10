/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationPlugin } from "@kbn/wci-common";
import { InternalIntegrationServices } from "@kbn/wci-common";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "./mcp/sse_client";


export interface Integration {
    id: string;
    configuration: Record<string, any>;

    connect(services: InternalIntegrationServices): Client;
}

export class InternalIntegration implements Integration {
    public id: string;
    typeInstance: IntegrationPlugin;
    configuration: Record<string, any>;

    constructor(
        id: string,
        typeInstance: IntegrationPlugin,
        configuration: Record<string, any>
    ) {
        this.id = id;
        this.typeInstance = typeInstance;
        this.configuration = configuration;
    }

    connect(services: InternalIntegrationServices): Client {

        const mcpServer = this.typeInstance.mcpServer(this.configuration, services);

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        const client = new Client({
            name: this.id,
            version: "1.0.0"
        });

        mcpServer.connect(clientTransport);
        client.connect(serverTransport);

        return client;
    }

}

export class ExternalIntegration implements Integration {
    public id: string;
    configuration: Record<string, any>;

    constructor(
        id: string,
        configuration: Record<string, any>
    ) {
        this.id = id;
        this.configuration = configuration;
    }

    connect(): Client {
        const transport = new SSEClientTransport(new URL(this.configuration.url));

          const client = new Client(
            {
              name: this.id,
              version: "1.0.0"
            },
            {
              capabilities: {
                prompts: {},
                resources: {},
                tools: {}
              }
            }
          );

          client.connect(transport);

          return client;
    }


}
