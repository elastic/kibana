/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { SearchTypes } from '../../../../common/detection_engine/types';
import type { ManagedUserHits } from '../../../../common/search_strategy/security_solution/users/managed_details';

export interface ManagedUserTable {
  value: SearchTypes[];
  field?: string;
}

export type ManagedUsersTableColumns = Array<EuiBasicTableColumn<ManagedUserTable>>;

export interface ManagedUserData {
  isLoading: boolean;
  data: ManagedUserHits | undefined;
  isIntegrationEnabled: boolean;
}
