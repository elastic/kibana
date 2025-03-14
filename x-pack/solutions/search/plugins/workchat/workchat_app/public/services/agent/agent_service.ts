/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { GetAgentResponse, ListAgentResponse } from '../../../common/http_api/agents';

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list() {
    const response = await this.http.post<ListAgentResponse>('/internal/workchat/agents', {
      body: JSON.stringify({}),
    });
    return response.agents;
  }

  async get(agentId: string) {
    return await this.http.get<GetAgentResponse>(`/internal/workchat/agents/${agentId}`);
  }
}
