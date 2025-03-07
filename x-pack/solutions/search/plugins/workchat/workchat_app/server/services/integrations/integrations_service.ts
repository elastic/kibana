import { Logger } from "@kbn/logging";
import { IntegrationPlugin, IntegrationTypes, InternalIntegrationServices } from "@kbn/wci-common";
import { Integration, InternalIntegration } from "./integration";
import { IntergrationsSession } from "./integrations_session";

interface IntegrationsServiceOptions {
    logger: Logger;
    integrationPlugins: IntegrationPlugin[];
}

export interface IntegrationModel {
    id: string;
    type: IntegrationTypes;
    configuration: Record<string, any>;
}

// TODO: move to reading from saved objects
const IntegrationsSO: IntegrationModel[] = [
    {
        id: '123',
        type: 'salesforce' as IntegrationTypes,
        configuration: {}
    },

]

function getIntegration(integrationModel: IntegrationModel, integrationPlugins: IntegrationPlugin[]): Integration {
    const plugin = integrationPlugins.find(plugin => plugin.name === integrationModel.type);
    if (!plugin) {
        throw new Error(`Integration plugin for ${integrationModel.type} not found`);
    }
    return new InternalIntegration(integrationModel.id, plugin, integrationModel.configuration);
}

    export function getIntegrations(integrationModels: IntegrationModel[], integrationPlugins: IntegrationPlugin[]): Integration[] {
    return integrationModels.map(model => getIntegration(model, integrationPlugins));
}

export class IntegrationsService {

    private logger: Logger;
    private integrationPlugins: IntegrationPlugin[];
    private integrations: Integration[];

    constructor({ logger, integrationPlugins }: IntegrationsServiceOptions) {
        this.logger = logger;
        this.integrationPlugins = integrationPlugins;
        this.integrations = getIntegrations(IntegrationsSO, this.integrationPlugins);
    }

    async createSession(internalServices: InternalIntegrationServices): Promise<IntergrationsSession> {
        this.logger.debug('Creating integrations session');
        const integrationsSession = new IntergrationsSession(internalServices, this.integrations);
        return integrationsSession;
    }
    
}