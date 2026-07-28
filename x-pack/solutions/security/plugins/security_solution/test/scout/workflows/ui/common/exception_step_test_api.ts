/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';

export type NamespaceType = 'single' | 'agnostic';

export interface ApiExceptionEntry {
  type: string;
  field: string;
  operator?: 'included' | 'excluded';
  value?: string | string[];
  list?: { id: string; type: string };
}

export interface ExceptionListItem {
  id: string;
  item_id: string;
  list_id: string;
  namespace_type: NamespaceType;
  name: string;
  description: string;
  entries: ApiExceptionEntry[];
}

interface DetectionRule {
  id: string;
  rule_id: string;
  name: string;
  exceptions_list?: Array<{
    id: string;
    list_id: string;
    type: string;
    namespace_type: NamespaceType;
  }>;
}

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_RULES_BULK_ACTION = '/api/detection_engine/rules/_bulk_action';
const EXCEPTION_LIST_URL = '/api/exception_lists';
const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';
const EXCEPTION_LIST_ITEM_FIND_URL = '/api/exception_lists/items/_find';
const LIST_INDEX_URL = '/api/lists/index';
const LIST_URL = '/api/lists';
const WORKFLOWS_URL = '/api/workflows';

/**
 * Server-side setup, verification and cleanup for the exception workflow-step
 * UI tests, scoped to the test's space. Elevated (kbnClient) on purpose: the
 * subject under test is the workflow authored and run in the browser; this only
 * prepares targets and reads back what the step produced.
 */
export class ExceptionStepTestApi {
  private readonly basePath: string;

  constructor(spaceId: string, private readonly kbnClient: KbnClient) {
    this.basePath = `/s/${spaceId}`;
  }

  private path(url: string): string {
    return `${this.basePath}${url}`;
  }

  /** Create a custom query rule; returns it including the generated UUID `id`. */
  async createQueryRule(ruleId: string, name: string): Promise<DetectionRule> {
    const { data } = await this.kbnClient.request<DetectionRule>({
      method: 'POST',
      path: this.path(DETECTION_ENGINE_RULES_URL),
      body: {
        rule_id: ruleId,
        name,
        description: name,
        type: 'query',
        query: '*:*',
        language: 'kuery',
        index: ['logs-*'],
        risk_score: 21,
        severity: 'low',
        enabled: false,
      },
      retries: 0,
    });
    return data;
  }

  async getRule(ruleId: string): Promise<DetectionRule> {
    const { data } = await this.kbnClient.request<DetectionRule>({
      method: 'GET',
      path: this.path(`${DETECTION_ENGINE_RULES_URL}?id=${encodeURIComponent(ruleId)}`),
    });
    return data;
  }

  async createExceptionList(
    listId: string,
    namespaceType: NamespaceType,
    type = 'detection'
  ): Promise<void> {
    await this.kbnClient.request({
      method: 'POST',
      path: this.path(EXCEPTION_LIST_URL),
      body: {
        list_id: listId,
        name: listId,
        description: listId,
        type,
        namespace_type: namespaceType,
      },
    });
  }

  async deleteExceptionList(listId: string, namespaceType: NamespaceType): Promise<void> {
    await this.kbnClient.request({
      method: 'DELETE',
      path: this.path(
        `${EXCEPTION_LIST_URL}?list_id=${encodeURIComponent(
          listId
        )}&namespace_type=${namespaceType}`
      ),
      ignoreErrors: [404],
    });
  }

  async createValueList(listId: string, type: string): Promise<void> {
    await this.kbnClient.request({
      method: 'POST',
      path: this.path(LIST_INDEX_URL),
      ignoreErrors: [409],
    });
    await this.kbnClient.request({
      method: 'POST',
      path: this.path(LIST_URL),
      body: { id: listId, name: listId, description: listId, type },
      ignoreErrors: [409],
    });
  }

  async getExceptionItemByItemId(
    itemId: string,
    namespaceType: NamespaceType
  ): Promise<ExceptionListItem> {
    const { data, status } = await this.kbnClient.request<ExceptionListItem>({
      method: 'GET',
      path: this.path(
        `${EXCEPTION_LIST_ITEM_URL}?item_id=${encodeURIComponent(
          itemId
        )}&namespace_type=${namespaceType}`
      ),
      ignoreErrors: [404],
    });
    if (status === 404) {
      throw new Error(`Exception item "${itemId}" (${namespaceType}) not found`);
    }
    return data;
  }

  async findItemsInList(
    listId: string,
    namespaceType: NamespaceType
  ): Promise<ExceptionListItem[]> {
    const { data } = await this.kbnClient.request<{ data: ExceptionListItem[] }>({
      method: 'GET',
      path: this.path(
        `${EXCEPTION_LIST_ITEM_FIND_URL}?list_id=${encodeURIComponent(
          listId
        )}&namespace_type=${namespaceType}&per_page=100`
      ),
    });
    return data.data;
  }

  async deleteExceptionItem(itemId: string, namespaceType: NamespaceType): Promise<void> {
    await this.kbnClient.request({
      method: 'DELETE',
      path: this.path(
        `${EXCEPTION_LIST_ITEM_URL}?item_id=${encodeURIComponent(
          itemId
        )}&namespace_type=${namespaceType}`
      ),
      ignoreErrors: [404],
    });
  }

  async deleteValueList(listId: string): Promise<void> {
    await this.kbnClient.request({
      method: 'DELETE',
      path: this.path(`${LIST_URL}?id=${encodeURIComponent(listId)}`),
      // 409 when still referenced by an exception item; callers delete the item first.
      ignoreErrors: [404, 409],
    });
  }

  /** Remove all rules, exception lists and workflows created in the space. */
  async cleanup(): Promise<void> {
    await this.kbnClient.request({
      method: 'POST',
      path: this.path(DETECTION_ENGINE_RULES_BULK_ACTION),
      body: { query: '', action: 'delete' },
      ignoreErrors: [404],
    });

    const { data } = await this.kbnClient.request<{ results?: Array<{ id: string }> }>({
      method: 'GET',
      path: this.path(`${WORKFLOWS_URL}?size=10000&page=1`),
      ignoreErrors: [404],
    });
    const workflowIds = data.results?.map((workflow) => workflow.id) ?? [];
    if (workflowIds.length > 0) {
      await this.kbnClient.request({
        method: 'DELETE',
        path: this.path(WORKFLOWS_URL),
        body: { ids: workflowIds },
        ignoreErrors: [404],
      });
    }
  }
}
