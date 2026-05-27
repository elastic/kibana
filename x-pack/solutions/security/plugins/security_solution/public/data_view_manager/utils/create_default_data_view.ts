/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { KibanaDataView, SourcererModel } from '../../sourcerer/store/model';
import { initDataView } from '../../sourcerer/store/model';
import { initializeSecuritySolution } from '../../common/components/initialization/api';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
  InitializationFlowsResult,
} from '../../../common/api/initialization';
import type { SecurityDataViewsReadyResult } from '../../../common/api/initialization';
import { hasAccessToSecuritySolution } from '../../helpers_access';

export interface CreateDefaultDataViewDependencies {
  http: CoreStart['http'];
  application: CoreStart['application'];
  skip?: boolean;
}

export const createDefaultDataView = async ({
  http,
  application,
  skip = false,
}: CreateDefaultDataViewDependencies) => {
  let defaultDataView: SourcererModel['defaultDataView'];
  let alertDataView: SourcererModel['alertDataView'];
  let attackDataView: SourcererModel['attackDataView'];
  let kibanaDataViews: SourcererModel['kibanaDataViews'];

  const signal: { name: string | null; index_mapping_outdated: null | boolean } = {
    index_mapping_outdated: null,
    name: null,
  };

  if (skip) {
    return {
      alertDataView: { ...initDataView },
      attackDataView: { ...initDataView },
      defaultDataView: { ...initDataView },
      kibanaDataViews: [],
      signal,
    };
  }

  try {
    if (!hasAccessToSecuritySolution(application.capabilities)) {
      throw new Error('No access to Security Solution');
    }

    // Called directly instead of useSecuritySolutionInitialization because this
    // runs inside a Redux listener (non-React context). TODO: refactor to consume
    // the hook result from the React layer instead.
    const response = await initializeSecuritySolution({
      flows: [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS],
      http,
    });

    const flowResult = response.flows[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS];

    if (!flowResult || flowResult.status !== INITIALIZATION_FLOW_STATUS_READY) {
      throw new Error(
        (flowResult?.status === INITIALIZATION_FLOW_STATUS_ERROR ? flowResult.error : null) ??
          'Failed to initialize security data views'
      );
    }

    const schema = InitializationFlowsResult.shape[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS];
    const parsed = schema.parse(flowResult);
    const payload = (parsed as SecurityDataViewsReadyResult).payload;

    defaultDataView = { ...initDataView, ...payload.defaultDataView };
    alertDataView = { ...initDataView, ...payload.alertDataView };
    attackDataView = payload.attackDataView
      ? { ...initDataView, ...payload.attackDataView }
      : { ...initDataView };
    kibanaDataViews = payload.kibanaDataViews.map((dataView: KibanaDataView) => ({
      ...initDataView,
      ...dataView,
    }));
    signal.name = payload.signalIndexName;
  } catch (error) {
    defaultDataView = { ...initDataView, error };
    alertDataView = { ...initDataView, error };
    attackDataView = { ...initDataView, error };
    kibanaDataViews = [];
  }
  return { alertDataView, attackDataView, defaultDataView, kibanaDataViews, signal };
};
