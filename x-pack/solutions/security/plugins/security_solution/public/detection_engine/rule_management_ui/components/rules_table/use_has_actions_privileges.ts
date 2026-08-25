/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import { isBoolean } from '../../../../common/utils/privileges';

export const useHasActionsPrivileges = () => {
  const {
    services: {
      application: {
        capabilities: { actions },
      },
    },
  } = useKibana();
  return isBoolean(actions.show) ? actions.show : true;
};
