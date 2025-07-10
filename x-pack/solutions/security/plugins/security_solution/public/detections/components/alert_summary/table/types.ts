/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsTablePropsWithRef } from '@kbn/response-ops-alerts-table/types';
import type { AdditionalTableContext } from './table';

export type TableProps = AlertsTablePropsWithRef<AdditionalTableContext>;
export type GetTableProp<PropKey extends keyof TableProps> = NonNullable<TableProps[PropKey]>;
