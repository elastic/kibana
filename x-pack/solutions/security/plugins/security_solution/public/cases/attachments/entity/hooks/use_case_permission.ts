/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions } from '@kbn/cases-plugin/common';
import { APP_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

export interface EntityCasePermissions {
  canAddToCase: boolean;
}

/**
 * Returns if a user can add an entity to a new or existing case.
 * `createComment` is required because attachments are added as case comment/user-action entries.
 * Either `create` or `update` is sufficient for attaching: `create` to attach to a new case,
 * `update` to attach to an existing one.
 * Owner is scoped to `APP_ID` (`securitySolution`) so permissions match what the Cases API enforces.
 */
export const useEntityCasePermissions = (): EntityCasePermissions => {
  const { cases } = useKibana().services;
  const permissions: CasesPermissions = cases.helpers.canUseCases([APP_ID]);

  return {
    canAddToCase: permissions.createComment && (permissions.create || permissions.update),
  };
};
