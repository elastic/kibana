/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { DataSourceSelection, isDatasetSelection } from '../../common/data_source_selection';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export interface DiscoverEsqlUrlProps {
  href?: string;
  onClick: () => void;
}

export interface UseEsqlResult {
  isEsqlEnabled: boolean;
  discoverEsqlUrlProps: DiscoverEsqlUrlProps;
}

interface EsqlContextDeps {
  dataSourceSelection: DataSourceSelection;
}

export const useEsql = ({ dataSourceSelection }: EsqlContextDeps): UseEsqlResult => {
  const {
    services: { uiSettings, discover },
  } = useKibanaContextForPlugin();

  const isEsqlEnabled = uiSettings?.get(ENABLE_ESQL);

  const esqlPattern = isDatasetSelection(dataSourceSelection)
    ? dataSourceSelection.selection.dataset.name
    : dataSourceSelection.selection.dataView.title;

  const discoverLinkParams = {
    query: {
      esql: `FROM ${esqlPattern} | LIMIT 10`,
    },
  };

  const href = discover.locator?.useUrl(discoverLinkParams);

  const onClick = () => {
    discover.locator?.navigate(discoverLinkParams);
  };

  return {
    // Data
    isEsqlEnabled,
    discoverEsqlUrlProps: {
      href,
      onClick,
    },
  };
};
