/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { type SavedQuery, TimefilterContract } from '@kbn/data-plugin/public';
import { AlertsSearchBarProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_search_bar';
import { BoolQuery, Filter, Query } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { AlertStatus } from '../../../common/typings';
export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: AlertStatus) => void;
}

export interface AlertSearchBarWithUrlSyncProps extends CommonAlertSearchBarProps {
  urlStorageKey: string;
  defaultState?: AlertSearchBarContainerState;
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
  useToasts: () => ToastsStart;
  uiSettings: IUiSettingsClient;
}

export interface ObservabilityAlertSearchBarProps
  extends AlertSearchBarContainerState,
    AlertSearchBarStateTransitions,
    CommonAlertSearchBarProps {
  showFilterBar?: boolean;
  savedQuery?: SavedQuery;
  services: Services;
}

export interface AlertSearchBarContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: AlertStatus;
  filters?: Filter[];
  savedQueryId?: string;
}

interface AlertSearchBarStateTransitions {
  onRangeFromChange: (rangeFrom: string) => void;
  onRangeToChange: (rangeTo: string) => void;
  onKueryChange: (kuery: string) => void;
  onStatusChange: (status: AlertStatus) => void;
  onFiltersChange?: (filters: Filter[]) => void;
  setSavedQuery?: (savedQueryId?: SavedQuery) => void;
}

interface CommonAlertSearchBarProps {
  appName: string;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
  defaultSearchQueries?: Query[];
}
