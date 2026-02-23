/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from 'undici';

export interface CalderaClientOptions {
    calderaUrl: string;
    /**
     * Caldera API key (header `KEY: <value>`).
     *
     * If omitted, only unauthenticated checks can be performed.
     */
    apiKey?: string;
}

export class CalderaClient {
    private readonly baseUrl: string;
    private readonly apiKey?: string;

    constructor(opts: CalderaClientOptions) {
        this.baseUrl = opts.calderaUrl.replace(/\/$/, '');
        this.apiKey = opts.apiKey;
    }

    public async healthCheck(): Promise<boolean> {
        try {
            // Some Caldera deployments require API keys even for health endpoints.
            const res = await request(`${this.baseUrl}/api/v2/health`, {
                method: 'GET',
                headers: this.apiKey ? { KEY: this.apiKey } : undefined,
            });
            return res.statusCode >= 200 && res.statusCode < 400;
        } catch {
            return false;
        }
    }

    public async getAgents(): Promise<any[]> {
        return await this.authedJson('GET', '/api/v2/agents');
    }

    public async getAgentByPaw(paw: string): Promise<any> {
        return await this.authedJson('GET', `/api/v2/agents/${paw}`);
    }

    public async updateAgent(paw: string, payload: any): Promise<any> {
        return await this.authedJson('PUT', `/api/v2/agents/${paw}`, payload);
    }

    public async getAdversaries(): Promise<any[]> {
        return await this.authedJson('GET', '/api/v2/adversaries');
    }

    public async getAbilities(): Promise<any[]> {
        return await this.authedJson('GET', '/api/v2/abilities');
    }

    public async getSources(): Promise<any[]> {
        return await this.authedJson('GET', '/api/v2/sources');
    }

    public async createSource(payload: any): Promise<any> {
        return await this.authedJson('POST', '/api/v2/sources', payload);
    }

    public async createAbility(payload: any): Promise<any> {
        return await this.authedJson('POST', '/api/v2/abilities', payload);
    }

    public async createAdversary(payload: any): Promise<any> {
        return await this.authedJson('POST', '/api/v2/adversaries', payload);
    }

    public async createOperation(payload: any): Promise<any> {
        return await this.authedJson('POST', '/api/v2/operations', payload);
    }

    public async getOperations(): Promise<any[]> {
        return await this.authedJson('GET', '/api/v2/operations');
    }

    public async getOperationLinks(operationId: string): Promise<any[]> {
        return await this.authedJson('GET', `/api/v2/operations/${operationId}/links`);
    }

    public async getOperationLink(operationId: string, linkId: string): Promise<any> {
        return await this.authedJson('GET', `/api/v2/operations/${operationId}/links/${linkId}`);
    }

    /**
     * Best-effort fetch of a link's result payload (stdout/stderr/etc).
     * Endpoint availability can vary by Caldera version/plugins; callers should catch errors.
     */
    public async getOperationLinkResult(operationId: string, linkId: string): Promise<any> {
        return await this.authedJson('GET', `/api/v2/operations/${operationId}/links/${linkId}/result`);
    }

    private async authedJson(method: string, path: string, body?: unknown): Promise<any> {
        if (!this.apiKey) {
            throw new Error(`Caldera API key is required for ${method} ${path} (pass --calderaApiKey)`);
        }

        const res = await request(`${this.baseUrl}${path}`, {
            method,
            headers: {
                'content-type': 'application/json',
                KEY: this.apiKey,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const text = await res.body.text();
        if (res.statusCode < 200 || res.statusCode >= 300) {
            throw new Error(`Caldera API ${method} ${path} failed: HTTP ${res.statusCode}: ${text}`);
        }

        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return text;
        }
    }
}


