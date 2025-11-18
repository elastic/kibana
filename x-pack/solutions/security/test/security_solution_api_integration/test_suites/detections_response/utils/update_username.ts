/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const updateUsername = <T extends Record<string, any>>(
  entity: T,
  username: string
): T & { created_by: string; updated_by: string } => {
  return {
    ...entity,
    created_by: username,
    updated_by: username,
  };
};
