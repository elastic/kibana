/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { type FilterControlConfig, FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { HttpStart } from '@kbn/core-http-browser';
import { type NotificationsStart, ToastsStart } from '@kbn/core-notifications-browser';
import {
  DataPublicPluginStart,
  type SavedQuery,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AlertsSearchBarProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_search_bar';
import { BoolQuery, Filter } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { AlertStatus } from '../../../common/typings';
export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: AlertStatus) => void;
}

export interface AlertSearchBarWithUrlSyncProps extends CommonAlertSearchBarProps {
  urlStorageKey: string;
  defaultState?: AlertSearchBarContainerState;
  disableLocalStorageSync?: boolean;
}

export interface Dependencies {
  data: {
    query: {
      timefilter: { timefilter: TimefilterContract };
    };
  };
  triggersActionsUi: {
    getAlertsSearchBar: (props: AlertsSearchBarProps) => ReactElement<AlertsSearchBarProps>;
  };
  useToasts: () => ToastsStart;
}

export interface Services {
  timeFilterService: TimefilterContract;
  AlertsSearchBar: (props: AlertsSearchBarProps) => ReactElement<AlertsSearchBarProps>;
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
  spaces?: SpacesPluginStart;
  useToasts: () => ToastsStart;
  uiSettings: IUiSettingsClient;
}

export interface ObservabilityAlertSearchBarProps
  extends AlertSearchBarContainerState,
    AlertSearchBarStateTransitions,
    CommonAlertSearchBarProps {
  services: Services;
  filterControls?: Filter[];
  onFilterControlsChange: (filterControls: Filter[]) => void;
  savedQuery?: SavedQuery;
  showFilterBar?: boolean;
  disableLocalStorageSync?: boolean;
}

export interface AlertSearchBarContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status?: AlertStatus;
  filters?: Filter[];
  savedQueryId?: string;
  controlConfigs?: FilterControlConfig[];
  groupings?: string[];
}

interface AlertSearchBarStateTransitions {
  onRangeFromChange: (rangeFrom: string) => void;
  onRangeToChange: (rangeTo: string) => void;
  onKueryChange: (kuery: string) => void;
  onStatusChange?: (status: AlertStatus) => void;
  onFiltersChange?: (filters: Filter[]) => void;
  setSavedQuery?: (savedQueryId?: SavedQuery) => void;
  onControlConfigsChange?: (controlConfigs: FilterControlConfig[]) => void;
}

interface CommonAlertSearchBarProps {
  appName: string;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
  defaultFilters?: Filter[];
  filterControls?: Filter[];
  onFilterControlsChange: (filterControls: Filter[]) => void;
  onControlApiAvailable?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
}
