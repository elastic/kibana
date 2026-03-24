/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRoleDescriptors } from '@kbn/ftr-common-functional-services';

const noAccessUserRole: KibanaRoleDescriptors = {
  elasticsearch: {
    indices: [],
  },
  kibana: [],
};

type CustomRoleNames = 'noAccessUserRole';

export const customRoles: Record<CustomRoleNames, KibanaRoleDescriptors> = {
  noAccessUserRole,
};
