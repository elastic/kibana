/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common';
import type { EntityDetailsHighlightsResponse } from '../../../common/api/entity_analytics/entity_details/highlights.gen';
import { ENTITY_DETAILS_HIGHLIGHT_INTERNAL_URL } from '../../../common/entity_analytics/entity_analytics/constants';
import type {
  AssetCriticalityRecord,
  CreateEntitySourceResponse,
  CreatePrivilegesImportIndexResponse,
  DisableRiskEngineResponse,
  EnableRiskEngineResponse,
  EntityAnalyticsPrivileges,
  FindAssetCriticalityRecordsResponse,
  InitMonitoringEngineResponse,
  InitRiskEngineResponse,
  ListEntitiesRequestQuery,
  ListEntitiesResponse,
  ListEntitySourcesResponse,
  PrivmonBulkUploadUsersCSVResponse,
  PrivMonHealthResponse,
  PrivMonPrivilegesResponse,
  ReadRiskEngineSettingsResponse,
  RiskEngineScheduleNowResponse,
  RiskEngineStatusResponse,
  RiskScoresEntityCalculationRequest,
  RiskScoresEntityCalculationResponse,
  RiskScoresPreviewRequest,
  RiskScoresPreviewResponse,
  SearchPrivilegesIndicesResponse,
  UpdateEntitySourceResponse,
  UploadAssetCriticalityRecordsResponse,
  ConfigureRiskEngineSavedObjectRequestBodyInput,
} from '../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  ASSET_CRITICALITY_INTERNAL_PRIVILEGES_URL,
  ASSET_CRITICALITY_PUBLIC_CSV_UPLOAD_URL,
  ASSET_CRITICALITY_PUBLIC_LIST_URL,
  ASSET_CRITICALITY_PUBLIC_URL,
  ENTITY_STORE_INTERNAL_PRIVILEGES_URL,
  getPrivmonMonitoringSourceByIdUrl,
  LIST_ENTITIES_URL,
  MONITORING_ENGINE_INIT_URL,
  MONITORING_ENTITY_LIST_SOURCES_URL,
  MONITORING_ENTITY_SOURCE_URL,
  MONITORING_USERS_CSV_UPLOAD_URL,
  PRIVMON_HEALTH_URL,
  PRIVMON_INDICES_URL,
  PRIVMON_PRIVILEGE_CHECK_API,
  RISK_ENGINE_CLEANUP_URL,
  RISK_ENGINE_CONFIGURE_SO_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_INIT_URL,
  RISK_ENGINE_PRIVILEGES_URL,
  RISK_ENGINE_SCHEDULE_NOW_URL,
  RISK_ENGINE_SETTINGS_URL,
  RISK_ENGINE_STATUS_URL,
  RISK_SCORE_ENTITY_CALCULATION_URL,
  RISK_SCORE_PREVIEW_URL,
} from '../../../common/constants';
import type { SnakeToCamelCase } from '../common/utils';
import { useKibana } from '../../common/lib/kibana/kibana_react';

export interface DeleteAssetCriticalityResponse {
  deleted: true;
}

/**
 * This hardcoded name was temporarily introduced for 9.1.0.
 * It is used to identify the only entity source that can be edited by the UI.
 */
const ENTITY_SOURCE_NAME = 'User Monitored Indices';

export const useEntityAnalyticsRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    /**
     * Fetches preview risks scores
     */
    const fetchRiskScorePreview = ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params: RiskScoresPreviewRequest;
    }) =>
      http.fetch<RiskScoresPreviewResponse>(RISK_SCORE_PREVIEW_URL, {
        version: '1',
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      });

    /**
     * Fetches entities from the Entity Store
     */
    const fetchEntitiesList = ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params: FetchEntitiesListParams;
    }) =>
      http.fetch<ListEntitiesResponse>(LIST_ENTITIES_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: {
          entity_types: params.entityTypes,
          sort_field: params.sortField,
          sort_order: params.sortOrder,
          page: params.page,
          per_page: params.perPage,
          filterQuery: params.filterQuery,
        },
        signal,
      });

    /**
     * Fetches risks engine status
     */
    const fetchRiskEngineStatus = ({ signal }: { signal?: AbortSignal }) =>
      http.fetch<RiskEngineStatusResponse>(RISK_ENGINE_STATUS_URL, {
        version: '1',
        method: 'GET',
        signal,
      });

    /**
     * Init risk score engine
     */
    const initRiskEngine = () =>
      http.fetch<InitRiskEngineResponse>(RISK_ENGINE_INIT_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Enable risk score engine
     */
    const enableRiskEngine = () =>
      http.fetch<EnableRiskEngineResponse>(RISK_ENGINE_ENABLE_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Disable risk score engine
     */
    const disableRiskEngine = () =>
      http.fetch<DisableRiskEngineResponse>(RISK_ENGINE_DISABLE_URL, {
        version: '1',
        method: 'POST',
      });

    /**
     * Enable risk score engine
     */
    const scheduleNowRiskEngine = () =>
      http.fetch<RiskEngineScheduleNowResponse>(RISK_ENGINE_SCHEDULE_NOW_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
      });

    /**
     * Calculate and stores risk score for an entity
     */
    const calculateEntityRiskScore = (params: RiskScoresEntityCalculationRequest) => {
      return http.fetch<RiskScoresEntityCalculationResponse>(RISK_SCORE_ENTITY_CALCULATION_URL, {
        version: '1',
        method: 'POST',
        body: JSON.stringify(params),
      });
    };

    /**
     * Get risk engine privileges
     */
    const fetchRiskEnginePrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(RISK_ENGINE_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Get asset criticality privileges
     */
    const fetchAssetCriticalityPrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(ASSET_CRITICALITY_INTERNAL_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Get Entity Store privileges
     */
    const fetchEntityStorePrivileges = () =>
      http.fetch<EntityAnalyticsPrivileges>(ENTITY_STORE_INTERNAL_PRIVILEGES_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Search indices for privilege monitoring import
     */
    const searchPrivMonIndices = async (params: {
      query: string | undefined;
      signal?: AbortSignal;
    }) =>
      http.fetch<SearchPrivilegesIndicesResponse>(PRIVMON_INDICES_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: {
          searchQuery: params.query,
        },
        signal: params.signal,
      });

    /**
     * Create an index for privilege monitoring import
     */
    const createPrivMonImportIndex = async (params: {
      name: string;
      mode: 'standard' | 'lookup';
      signal?: AbortSignal;
    }) =>
      http.fetch<CreatePrivilegesImportIndexResponse>(PRIVMON_INDICES_URL, {
        version: API_VERSIONS.public.v1,
        method: 'PUT',
        body: JSON.stringify({
          name: params.name,
          mode: params.mode,
        }),
        signal: params.signal,
      });
    /**
     * Register a data source for privilege monitoring engine
     */
    const registerPrivMonMonitoredIndices = async (indexPattern: string | undefined) =>
      http.fetch<CreateEntitySourceResponse>(MONITORING_ENTITY_SOURCE_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
        body: JSON.stringify({
          type: 'index',
          name: ENTITY_SOURCE_NAME,
          indexPattern,
        }),
      });

    /**
     * Update a data source for privilege monitoring engine
     */
    const updatePrivMonMonitoredIndices = async (id: string, indexPattern: string | undefined) =>
      http.fetch<UpdateEntitySourceResponse>(getPrivmonMonitoringSourceByIdUrl(id), {
        version: API_VERSIONS.public.v1,
        method: 'PUT',
        body: JSON.stringify({
          name: ENTITY_SOURCE_NAME,
          indexPattern,
        }),
      });

    /**
     * Create asset criticality
    /**
     *
     *
     * @param {(Pick<AssetCriticality, 'idField' | 'idValue' | 'criticalityLevel'> & {
     *         refresh?: 'wait_for';
     *       })} params
     * @return {*}  {Promise<AssetCriticalityRecord>}
     */
    const createAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue' | 'criticalityLevel'> & {
        refresh?: 'wait_for';
      }
    ): Promise<AssetCriticalityRecord> =>
      http.fetch<AssetCriticalityRecord>(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
        body: JSON.stringify({
          id_value: params.idValue,
          id_field: params.idField,
          criticality_level: params.criticalityLevel,
          refresh: params.refresh,
        }),
      });

    const deleteAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue'> & {
        refresh?: 'wait_for';
      }
    ): Promise<{ deleted: true }> => {
      await http.fetch(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'DELETE',
        query: {
          id_value: params.idValue,
          id_field: params.idField,
          refresh: params.refresh,
        },
      });

      // spoof a response to allow us to better distnguish a delete from a create in use_asset_criticality.ts
      return { deleted: true };
    };

    /**
     * Get asset criticality
     */
    const fetchAssetCriticality = async (
      params: Pick<AssetCriticality, 'idField' | 'idValue'>
    ): Promise<AssetCriticalityRecord> => {
      return http.fetch<AssetCriticalityRecord>(ASSET_CRITICALITY_PUBLIC_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: { id_value: params.idValue, id_field: params.idField },
      });
    };

    /**
     * Get multiple asset criticality records
     */
    const fetchAssetCriticalityList = async (params: {
      idField: string;
      idValues: string[];
    }): Promise<FindAssetCriticalityRecordsResponse> => {
      const wrapWithQuotes = (each: string) => `"${each}"`;
      const kueryValues = `${params.idValues.map(wrapWithQuotes).join(' OR ')}`;
      const kuery = `${params.idField}: (${kueryValues})`;

      return http.fetch<FindAssetCriticalityRecordsResponse>(ASSET_CRITICALITY_PUBLIC_LIST_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: {
          kuery,
        },
      });
    };

    const uploadAssetCriticalityFile = async (
      fileContent: string,
      fileName: string
    ): Promise<UploadAssetCriticalityRecordsResponse> => {
      const file = new File([new Blob([fileContent])], fileName, {
        type: 'text/csv',
      });
      const body = new FormData();
      body.append('file', file);

      return http.fetch<UploadAssetCriticalityRecordsResponse>(
        ASSET_CRITICALITY_PUBLIC_CSV_UPLOAD_URL,
        {
          version: API_VERSIONS.public.v1,
          method: 'POST',
          headers: {
            'Content-Type': undefined, // Lets the browser set the appropriate content type
          },
          body,
        }
      );
    };

    /**
     * List all data source for privilege monitoring engine
     */
    const listPrivMonMonitoredIndices = async ({ signal }: { signal?: AbortSignal }) =>
      http.fetch<ListEntitySourcesResponse>(MONITORING_ENTITY_LIST_SOURCES_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        signal,
        query: {
          type: 'index',
          managed: false,
          name: ENTITY_SOURCE_NAME,
        },
      });

    const uploadPrivilegedUserMonitoringFile = async (
      fileContent: string,
      fileName: string
    ): Promise<PrivmonBulkUploadUsersCSVResponse> => {
      const file = new File([new Blob([fileContent])], fileName, {
        type: 'text/csv',
      });
      const body = new FormData();
      body.append('file', file);

      return http.fetch<PrivmonBulkUploadUsersCSVResponse>(MONITORING_USERS_CSV_UPLOAD_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
        headers: {
          'Content-Type': undefined, // Lets the browser set the appropriate content type
        },
        body,
      });
    };

    const initPrivilegedMonitoringEngine = (): Promise<InitMonitoringEngineResponse> =>
      http.fetch<InitMonitoringEngineResponse>(MONITORING_ENGINE_INIT_URL, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
      });

    const fetchPrivilegeMonitoringEngineStatus = (): Promise<PrivMonHealthResponse> =>
      http.fetch<PrivMonHealthResponse>(PRIVMON_HEALTH_URL, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
      });

    const fetchPrivilegeMonitoringPrivileges = (): Promise<PrivMonPrivilegesResponse> =>
      http.fetch<PrivMonPrivilegesResponse>(PRIVMON_PRIVILEGE_CHECK_API, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
      });

    /**
     * Fetches risk engine settings
     */
    const fetchRiskEngineSettings = () =>
      http.fetch<ReadRiskEngineSettingsResponse>(RISK_ENGINE_SETTINGS_URL, {
        version: '1',
        method: 'GET',
      });

    /**
     * Deletes Risk engine installation and associated data
     */

    const cleanUpRiskEngine = () =>
      http.fetch(RISK_ENGINE_CLEANUP_URL, {
        version: '1',
        method: 'DELETE',
      });

    const updateSavedObjectConfiguration = (
      params: ConfigureRiskEngineSavedObjectRequestBodyInput
    ) =>
      http.fetch(RISK_ENGINE_CONFIGURE_SO_URL, {
        version: API_VERSIONS.public.v1,
        method: 'PUT',
        body: JSON.stringify(params),
      });

    const fetchEntityDetailsHighlights = (
      params: {
        entityType: string;
        entityIdentifier: string;
        anonymizationFields: AnonymizationFieldResponse[];
        from: number;
        to: number;
        connectorId: string;
      },
      signal?: AbortSignal
    ): Promise<EntityDetailsHighlightsResponse> =>
      http.fetch(ENTITY_DETAILS_HIGHLIGHT_INTERNAL_URL, {
        version: API_VERSIONS.internal.v1,
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      });

    return {
      fetchRiskScorePreview,
      fetchRiskEngineStatus,
      initRiskEngine,
      enableRiskEngine,
      disableRiskEngine,
      scheduleNowRiskEngine,
      fetchRiskEnginePrivileges,
      fetchAssetCriticalityPrivileges,
      fetchEntityStorePrivileges,
      searchPrivMonIndices,
      createPrivMonImportIndex,
      createAssetCriticality,
      deleteAssetCriticality,
      fetchAssetCriticality,
      fetchAssetCriticalityList,
      uploadAssetCriticalityFile,
      uploadPrivilegedUserMonitoringFile,
      initPrivilegedMonitoringEngine,
      registerPrivMonMonitoredIndices,
      updatePrivMonMonitoredIndices,
      fetchPrivilegeMonitoringEngineStatus,
      fetchPrivilegeMonitoringPrivileges,
      fetchRiskEngineSettings,
      calculateEntityRiskScore,
      cleanUpRiskEngine,
      fetchEntitiesList,
      updateSavedObjectConfiguration,
      listPrivMonMonitoredIndices,
      fetchEntityDetailsHighlights,
    };
  }, [http]);
};

export type AssetCriticality = SnakeToCamelCase<AssetCriticalityRecord>;

export type FetchEntitiesListParams = SnakeToCamelCase<ListEntitiesRequestQuery>;
