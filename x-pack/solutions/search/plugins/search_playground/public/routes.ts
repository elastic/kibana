/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SEARCH_PLAYGROUND_APP_ID = `search_playground`;
export const ROOT_PATH = '/';

export const SEARCH_PLAYGROUND_NOT_FOUND = `${ROOT_PATH}not_found`;
export const SEARCH_PLAYGROUND_CHAT_PATH = `${ROOT_PATH}chat`;
export const PLAYGROUND_CHAT_QUERY_PATH = `${SEARCH_PLAYGROUND_CHAT_PATH}/query`;
export const SEARCH_PLAYGROUND_SEARCH_PATH = `${ROOT_PATH}search`;
export const PLAYGROUND_SEARCH_QUERY_PATH = `${SEARCH_PLAYGROUND_SEARCH_PATH}/query`;
export const SAVED_PLAYGROUND_BASE_PATH = `${ROOT_PATH}p/:playgroundId`;
export const SAVED_PLAYGROUND_PATH = `${SAVED_PLAYGROUND_BASE_PATH}/:pageMode?/:viewMode?`;
export const SAVED_PLAYGROUND_CHAT_PATH = `${SAVED_PLAYGROUND_BASE_PATH}/chat`;
export const SAVED_PLAYGROUND_CHAT_QUERY_PATH = `${SAVED_PLAYGROUND_CHAT_PATH}/query`;
export const SAVED_PLAYGROUND_SEARCH_PATH = `${SAVED_PLAYGROUND_BASE_PATH}/search`;
export const SAVED_PLAYGROUND_SEARCH_QUERY_PATH = `${SAVED_PLAYGROUND_SEARCH_PATH}/query`;
