/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from "@kbn/logging";
import { IntegrationPlugin, IntegrationTypes, InternalIntegrationServices } from "@kbn/wci-common";
import { ExternalIntegration, Integration, InternalIntegration } from "./integration";
import { IntergrationsSession } from "./integrations_session";

interface IntegrationsServiceOptions {
  logger: Logger;
  integrationPlugins: IntegrationPlugin[];
}

export interface ExternalIntegrationModel {
    id: string;
    configuration: Record<string, any>;
    isInternal: false;
}

export interface InternalIntegrationModel {
    id: string;
    configuration: Record<string, any>;
    type?: IntegrationTypes;
    isInternal: true;
}

type IntegrationModel = ExternalIntegrationModel | InternalIntegrationModel;

// TODO: move to reading from saved objects
const IntegrationsSO: IntegrationModel[] = [
    {
        id: '1',
        type: 'salesforce' as IntegrationTypes,
        configuration: {},
        isInternal: true
    },
    {
        id: '2',
        configuration: {
            url: "http://127.0.0.1:3001/sse",
        },
        isInternal: false
    }
]

function getIntegration(integrationModel: IntegrationModel, integrationPlugins: IntegrationPlugin[]): Integration {

    if (!integrationModel.isInternal) {
        return new ExternalIntegration(integrationModel.id, integrationModel.configuration);
    }

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
