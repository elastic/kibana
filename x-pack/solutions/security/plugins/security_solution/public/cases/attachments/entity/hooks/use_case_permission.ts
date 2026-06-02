/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions } from '@kbn/cases-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Decides if we enable or disable the add to existing and add to new case features.
 * The features are disabled if the entity has no name (the name is the attachment label),
 * or if the user lacks the required cases permissions.
 *
 * @param entityName the name of the entity
 * @return true if the features should be disabled
 */
export const useCaseDisabled = (entityName: string): boolean => {
  const { cases } = useKibana().services;
  const permissions: CasesPermissions = cases.helpers.canUseCases();

  const invalidEntityName: boolean = !entityName;
  const hasPermission: boolean = permissions.createComment && permissions.update;

  return invalidEntityName || !hasPermission;
};
