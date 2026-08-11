/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions } from '@kbn/cases-plugin/common';
import { APP_ID } from '../../../../../common/constants';
import { EMPTY_VALUE } from '../../../../threat_intelligence/constants/common';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Decides if the add-to-case action should be disabled.
 * The action is available when the user can attach the indicator to either a new or existing case.
 * Owner is scoped to `APP_ID` (`securitySolution`) so permissions match what the Cases API enforces.
 *
 * @param indicatorName the name of the indicator
 * @return true if the features are enabled
 */
export const useCaseDisabled = (indicatorName: string): boolean => {
  const { cases } = useKibana().services;
  const permissions: CasesPermissions = cases.helpers.canUseCases([APP_ID]);

  // disable the item if there is no indicator name or if the user doesn't have the right permission
  // in the case's attachment, the indicator name is the link to open the flyout
  const invalidIndicatorName: boolean = indicatorName === EMPTY_VALUE;
  const hasPermission: boolean =
    permissions.createComment && (permissions.create || permissions.update);

  return invalidIndicatorName || !hasPermission;
};
