/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView, DataViewSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import { RELATED_INTEGRATION } from '../../constants';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';

// Unique id for the ad-hoc dataView created for the alert summary page (used so we can retrieve the DataView from the flyout)
export const DATA_VIEW_ID = 'alert-summary-data-view-id';

// Runtime field to extract the related integration package name from the alert rule parameters field
export const RUNTIME_FIELD_MAP: Record<string, RuntimeFieldSpec> = {
  [RELATED_INTEGRATION]: {
    type: 'keyword',
    script: {
      source: `if (params._source.containsKey('kibana.alert.rule.parameters') && params._source['kibana.alert.rule.parameters'].containsKey('related_integrations')) { def integrations = params._source['kibana.alert.rule.parameters']['related_integrations']; if (integrations != null && integrations.size() > 0 && integrations[0].containsKey('package')) { emit(integrations[0]['package']); } }`,
    },
  },
};

export interface UseCreateDataViewResult {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView | undefined;
  /**
   * Loading state while creating the dataView
   */
  loading: boolean;
}

/**
 * Hook that creates a DataView for the EASE pages (alert summary, attack discovery and case pages as well as for the alert details flyout.
 * - it takes into account the current space.
 * - it uses the DEFAULT_ALERTS_INDEX as the index pattern.
 * - it adds a runtime field to extract the related integration package name from the alert rule parameters field.
 * - we pass a constant id, to prevent recreating the same dataView on other pages or in the flyout. For this we rely on the cache built in the DataViewService.
 *
 * It returns a null dataView if the space is undefined, to prevent unnecessary renders of the components.
 */
export const useCreateEaseAlertsDataView = (): UseCreateDataViewResult => {
  const spaceId = useSpaceId();

  const signalIndexName: string = useMemo(
    () => (spaceId ? `${DEFAULT_ALERTS_INDEX}-${spaceId}` : ''),
    [spaceId]
  );
  const dataViewId: string = useMemo(
    () => (spaceId ? `${DATA_VIEW_ID}-${spaceId}` : ''),
    [spaceId]
  );

  const dataViewSpec: DataViewSpec = useMemo(
    () => ({
      id: dataViewId,
      runtimeFieldMap: RUNTIME_FIELD_MAP,
      title: signalIndexName,
    }),
    [dataViewId, signalIndexName]
  );

  // If the spaceId is undefined, we skip creating the dataView
  const { dataView, loading } = useCreateDataView({ dataViewSpec, skip: !spaceId });
  return {
    dataView,
    loading,
  };
};
