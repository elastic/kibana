/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Browser-side HTTP client for the Detection Engine v2 rules API.
 *
 * A plain class (no DI container) that takes an `HttpStart` instance on
 * construction. All methods return the raw API response body parsed as JSON.
 *
 * Ref: rule-fetch-api.md, rule-crud-api.md, rule-actions-api.md
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  DetectionRuleResponse,
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
} from '../../common/api';

// ---------------------------------------------------------------------------
// API path constants
// ---------------------------------------------------------------------------

const BASE_PATH = '/api/detection_engine/v2';
const RULES_PATH = `${BASE_PATH}/rules`;

const rulePath = (id: string): string => `${RULES_PATH}/${encodeURIComponent(id)}`;

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

/**
 * Mirrors the query params accepted by `GET /api/detection_engine/v2/rules`.
 *
 * All fields are optional. Array-valued fields are sent as repeated query
 * string keys (the Kibana HTTP client serialises them correctly).
 *
 * `sort_field` accepts only `name`, `enabled`, and `risk_score` — `severity`
 * is deliberately absent because lexicographic ordering is wrong and the API
 * does not silently substitute a risk_score sort.
 *
 * Ref: rule-fetch-api.md "The list endpoint", "Searching and sorting"
 */
export interface ListRulesParams {
  enabled?: boolean;
  type?: Array<'query' | 'threshold'>;
  severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
  tags?: string[];
  rule_ids?: string[];
  search?: string;
  sort_field?: 'name' | 'enabled' | 'risk_score';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

/** Response shape from `GET /api/detection_engine/v2/rules`. */
export interface DetectionRuleListResponse {
  page: number;
  per_page: number;
  total: number;
  data: DetectionRuleResponse[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Plain HTTP service for the Detection Engine v2 rules API.
 *
 * Construct once at plugin start, pass it to hooks or components that need it.
 */
export class DetectionRulesApi {
  constructor(private readonly http: HttpStart) {}

  /**
   * List detection rules.
   *
   * `GET /api/detection_engine/v2/rules`
   *
   * @param params - Filter, sort, and pagination parameters.
   */
  public async listRules(params: ListRulesParams = {}): Promise<DetectionRuleListResponse> {
    return this.http.get<DetectionRuleListResponse>(RULES_PATH, {
      query: params as Record<
        string,
        string | number | boolean | string[] | number[] | boolean[] | null | undefined
      >,
    });
  }

  /**
   * Enable a single detection rule.
   *
   * `POST /api/detection_engine/v2/rules/{id}/_enable`
   */
  public async enableRule(id: string): Promise<DetectionRuleResponse> {
    return this.http.post<DetectionRuleResponse>(`${rulePath(id)}/_enable`);
  }

  /**
   * Disable a single detection rule.
   *
   * `POST /api/detection_engine/v2/rules/{id}/_disable`
   */
  public async disableRule(id: string): Promise<DetectionRuleResponse> {
    return this.http.post<DetectionRuleResponse>(`${rulePath(id)}/_disable`);
  }

  /**
   * Delete a single detection rule.
   *
   * `DELETE /api/detection_engine/v2/rules/{id}`
   */
  public async deleteRule(id: string): Promise<DetectionRuleResponse> {
    return this.http.delete<DetectionRuleResponse>(rulePath(id));
  }

  /**
   * Get a single detection rule by id.
   *
   * `GET /api/detection_engine/v2/rules/{id}`
   */
  public async getRule(id: string): Promise<DetectionRuleResponse> {
    return this.http.get<DetectionRuleResponse>(rulePath(id));
  }

  /**
   * Create a detection rule.
   *
   * `POST /api/detection_engine/v2/rules`
   *
   * @param props - The create request body, validated against the public schema.
   */
  public async createRule(props: DetectionRuleCreateProps): Promise<DetectionRuleResponse> {
    return this.http.post<DetectionRuleResponse>(RULES_PATH, { body: JSON.stringify(props) });
  }

  /**
   * Replace a detection rule via PUT (full replacement).
   *
   * `PUT /api/detection_engine/v2/rules/{id}`
   *
   * The caller must send the complete current state. Omitted defaultable fields
   * reset to their defaults; omitted optional fields are cleared.
   *
   * @param id - The rule's object id.
   * @param props - The full update request body (no `enabled`).
   */
  public async updateRule(
    id: string,
    props: DetectionRuleUpdateProps
  ): Promise<DetectionRuleResponse> {
    return this.http.put<DetectionRuleResponse>(rulePath(id), { body: JSON.stringify(props) });
  }
}
