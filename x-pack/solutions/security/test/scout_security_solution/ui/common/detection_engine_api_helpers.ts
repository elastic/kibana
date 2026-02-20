/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const EXCEPTION_LISTS_URL = '/api/exception_lists';
const EXCEPTION_LISTS_ITEMS_URL = '/api/exception_lists/items';

/**
 * Create an exception list.
 */
export async function createExceptionList(
  kbnClient: { request: (opts: { method: string; path: string; body?: unknown; retries?: number }) => Promise<unknown> },
  params: { list_id: string; name: string; description: string; type: string }
): Promise<{ id: string; list_id: string }> {
  const response = await kbnClient.request<{ id: string; list_id: string }>({
    method: 'POST',
    path: EXCEPTION_LISTS_URL,
    body: params,
    retries: 0,
  });
  return response as { id: string; list_id: string };
}

/**
 * Create an exception list item.
 */
export async function createExceptionListItem(
  kbnClient: { request: (opts: { method: string; path: string; body?: unknown; retries?: number }) => Promise<unknown> },
  params: {
    list_id: string;
    item_id?: string;
    name: string;
    description?: string;
    type?: string;
    entries: Array<{ field: string; operator: string; type: string; value?: string[] }>;
  }
): Promise<{ id: string }> {
  const response = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: EXCEPTION_LISTS_ITEMS_URL,
    body: {
      list_id: params.list_id,
      item_id: params.item_id ?? 'simple_list_item',
      type: params.type ?? 'simple',
      name: params.name,
      description: params.description ?? 'Test exception item',
      entries: params.entries,
    },
    retries: 0,
  });
  return response as { id: string };
}

/**
 * Delete an exception list.
 */
export async function deleteExceptionList(
  kbnClient: { request: (opts: { method: string; path: string; retries?: number }) => Promise<unknown> },
  listId: string,
  namespaceType = 'single'
): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `${EXCEPTION_LISTS_URL}?list_id=${listId}&namespace_type=${namespaceType}`,
      retries: 0,
    });
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Get all exception lists and delete them.
 */
export async function deleteAllExceptionLists(
  kbnClient: { request: (opts: { method: string; path: string; retries?: number }) => Promise<unknown> }
): Promise<void> {
  try {
    const response = (await kbnClient.request({
      method: 'GET',
      path: `${EXCEPTION_LISTS_URL}/_find`,
      retries: 0,
    })) as { data?: Array<{ list_id: string }> };
    const lists = response?.data ?? [];
    for (const list of lists) {
      await deleteExceptionList(kbnClient, list.list_id);
    }
  } catch {
    // Best-effort cleanup
  }
}
