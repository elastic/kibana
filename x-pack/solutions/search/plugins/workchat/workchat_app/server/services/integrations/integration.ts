import { IntegrationPlugin } from "@kbn/wci-common";
import { InternalIntegrationServices } from "@kbn/wci-common";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";


export interface Integration {
    id: string;
    typeInstance: IntegrationPlugin;
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