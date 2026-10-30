/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEntityEnginePrivileges } from '../../entity_store/hooks/use_entity_engine_privileges';

/**
 * Linking and unlinking entities writes to the Entity Store index as the current user, so the
 * actions are only available when the user has write access to it (e.g. not for Viewers).
 */
export const useCanModifyResolution = (): { canModify: boolean; isLoading: boolean } => {
  const { data, isLoading } = useEntityEnginePrivileges();

  if (isLoading || data == null) {
    return { canModify: false, isLoading: true };
  }

  return { canModify: data.has_write_permissions === true, isLoading: false };
};
