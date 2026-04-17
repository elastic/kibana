/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';

export interface DataViewContextValue {
  dataView: DataView;
  dataViewRefetch?: () => void;
  dataViewIsLoading?: boolean;
  dataViewIsRefetching?: boolean;
}

export const DataViewContext = createContext<DataViewContextValue>({} as DataViewContextValue);

export { EntitiesTableSection } from './entities_table_section';
export {
  useEntityURLState,
  type EntityURLStateResult,
  type EntitiesBaseURLQuery,
  type URLQuery,
} from './hooks/use_entity_url_state';
