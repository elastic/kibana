/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * use oss as model when using openai and oss
 * else default to given model
 * if no model exists, let undefined and resolveProviderAndModel logic will determine the model from connector
 * @param llmType
 * @param isOssModel
 * @param model
 */
export const getModelOrOss = (
  llmType?: string,
  isOssModel?: boolean,
  model?: string
): string | undefined => (llmType === 'openai' && isOssModel ? 'oss' : model);
