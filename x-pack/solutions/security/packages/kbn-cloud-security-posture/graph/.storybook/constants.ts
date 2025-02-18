/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The title of the Storybook. */
export const TITLE = 'Cloud Security Posture Storybook';

/** The remote URL of the root from which Storybook loads stories for Cloud Security Solution. */
export const URL =
  'https://github.com/elastic/kibana/tree/main/x-pack/packages/kbn-cloud-security-posture';

export const WEB_STORAGE_CLEAR_ACTION = 'web_storage:clear' as const;
export const WEB_STORAGE_GET_ITEM_ACTION = 'web_storage:getItem' as const;
export const WEB_STORAGE_KEY_ACTION = 'web_storage:key' as const;
export const WEB_STORAGE_REMOVE_ITEM_ACTION = 'web_storage:removeItem' as const;
export const WEB_STORAGE_SET_ITEM_ACTION = 'web_storage:setItem' as const;
export const STORAGE_SET_ACTION = 'storage:set' as const;
export const STORAGE_REMOVE_ACTION = 'storage:remove' as const;
export const STORAGE_CLEAR_ACTION = 'storage:clear' as const;
export const NOTIFICATIONS_SHOW_ACTION = 'notifications:show' as const;
export const NOTIFICATIONS_SUCCESS_ACTION = 'notifications:success' as const;
export const NOTIFICATIONS_WARNING_ACTION = 'notifications:warning' as const;
export const NOTIFICATIONS_DANGER_ACTION = 'notifications:danger' as const;
export const NOTIFICATIONS_ADD_ERROR_ACTION = 'notifications:addError' as const;
export const NOTIFICATIONS_ADD_SUCCESS_ACTION = 'notifications:addSuccess' as const;
export const NOTIFICATIONS_ADD_WARNING_ACTION = 'notifications:addWarning' as const;
export const NOTIFICATIONS_REMOVE_ACTION = 'notifications:remove' as const;
export const EDIT_DATA_VIEW_ACTION = 'editDataView' as const;
