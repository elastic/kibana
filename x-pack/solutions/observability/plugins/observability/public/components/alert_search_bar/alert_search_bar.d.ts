import React from 'react';
import type { ObservabilityAlertSearchBarProps } from './types';
export declare function ObservabilityAlertSearchBar({ appName, defaultFilters, disableLocalStorageSync, onEsQueryChange, onKueryChange, onRangeFromChange, onRangeToChange, onControlConfigsChange, onFiltersChange, onFilterControlsChange, showFilterBar, controlConfigs, filters, filterControls, savedQuery, setSavedQuery, kuery, rangeFrom, rangeTo, onControlApiAvailable, services: { AlertsSearchBar, timeFilterService, http, notifications, dataViews, spaces, useToasts, uiSettings, }, }: ObservabilityAlertSearchBarProps): React.JSX.Element;
export default ObservabilityAlertSearchBar;
