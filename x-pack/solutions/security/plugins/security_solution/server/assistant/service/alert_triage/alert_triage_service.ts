/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
    ElasticsearchClient,
    Logger,
    SavedObjectsClientContract,
    KibanaRequest,
} from '@kbn/core/server';
import { AlertTriageJob } from './alert_triage_job';
import type { AlertTriageResult } from '../../types/alert_triage';
import { InferenceChatModel } from '@kbn/inference-langchain';

export interface AlertTriageServiceParams {
    connectorId: string;
    alertId: string;
    jobId: string;
}

type AlertTriageServiceConstructorParams = {
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    chatModel: InferenceChatModel;
    request: KibanaRequest;
    logger: Logger;
}
/**
 * Service class for creating and managing alert triage jobs.
 * Acts as a factory for AlertTriageJob instances.
 */
export class AlertTriageService {
    private readonly esClient: ElasticsearchClient;
    private readonly savedObjectsClient: SavedObjectsClientContract;
    private readonly chatModel: InferenceChatModel;
    private readonly request: KibanaRequest;
    private readonly logger: Logger;

    constructor(
        options: AlertTriageServiceConstructorParams
    ) {
        this.esClient = options.esClient;
        this.savedObjectsClient = options.savedObjectsClient;
        this.chatModel = options.chatModel;
        this.request = options.request;
        this.logger = options.logger;
    }

    /**
     * Create and execute an alert triage job.
     * This creates a new AlertTriageJob instance and executes it.
     */
    async processAlertTriageJob({
        connectorId,
        alertId,
        jobId,
    }: AlertTriageServiceParams): Promise<AlertTriageResult> {
        const job = new AlertTriageJob({
            alertId,
            jobId,
            esClient: this.esClient,
            savedObjectsClient: this.savedObjectsClient,
            chatModel: this.chatModel,
            request: this.request,
            logger: this.logger,
        });

        return job.execute();
    }

    /**
     * Create an alert triage job instance without executing it.
     * Useful for testing or when you want more control over execution.
     */
    createJob({
        connectorId,
        alertId,
        jobId,
    }: AlertTriageServiceParams): AlertTriageJob {
        return new AlertTriageJob({
            alertId,
            jobId,
            esClient: this.esClient,
            savedObjectsClient: this.savedObjectsClient,
            chatModel: this.chatModel,
            request: this.request,
            logger: this.logger,
        });
    }
}

