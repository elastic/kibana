/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiHighlight, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { useMonitorName } from '../../../hooks/use_monitor_name';
import { useSelectedLocation } from '../hooks/use_selected_location';

type MonitorOption = EuiSelectableOption & {
  locationIds?: string[];
};

export const MonitorSearchableList = ({ closePopover }: { closePopover: () => void }) => {
  const history = useHistory();
  const { recentMonitorOptions, loading: recentMonitorsLoading } = useRecentlyViewedMonitors();

  const [options, setOptions] = useState<MonitorOption[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const selectedLocation = useSelectedLocation();

  const { values, loading: searchLoading } = useMonitorName({ search: searchValue });

  useEffect(() => {
    const newOptions: MonitorOption[] = [];
    if (recentMonitorOptions.length > 0 && !searchValue) {
      const otherMonitors = values.filter((value) =>
        recentMonitorOptions.every((recent) => recent.key !== value.key)
      ) as MonitorOption[];

      if (otherMonitors.length > 0) {
        newOptions.push({
          key: 'monitors',
          label: OTHER_MONITORS,
          isGroupLabel: true,
          locationIds: [],
        });
      }

      setOptions([...recentMonitorOptions, ...newOptions, ...otherMonitors]);
    } else {
      setOptions(values);
    }
  }, [recentMonitorOptions, searchValue, values]);

  const getLocationId = (option: MonitorOption) => {
    if (option.locationIds?.includes(selectedLocation?.id ?? '')) {
      return selectedLocation?.id;
    }
    return option.locationIds?.[0];
  };

  return (
    <EuiSelectable<MonitorOption>
      searchable
      isLoading={searchLoading || recentMonitorsLoading}
      searchProps={{
        placeholder: PLACEHOLDER,
        compressed: true,
        onChange: (val) => setSearchValue(val),
        autoFocus: true,
      }}
      options={options}
      onChange={(selectedOptions) => {
        setOptions(selectedOptions);
        const option = selectedOptions.find((opt) => opt.checked === 'on');
        if (option && !option.isGroupLabel) {
          history.push(`/monitor/${option.key}?locationId=${getLocationId(option)}`);
          closePopover();
        }
      }}
      singleSelection={true}
      listProps={{
        showIcons: false,
      }}
      renderOption={(option) => <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>}
      noMatchesMessage={NO_RESULT_FOUND}
      emptyMessage={NO_RESULT_FOUND}
      loadingMessage={LOADING_MONITORS}
    >
      {(list, search) => (
        <div css={{ width: 320 }}>
          <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
          {list}
        </div>
      )}
    </EuiSelectable>
  );
};

const LOADING_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.loadingMonitors', {
  defaultMessage: 'Loading monitors',
});

const NO_RESULT_FOUND = i18n.translate('xpack.synthetics.monitorSummary.noResultsFound', {
  defaultMessage: 'No monitors found. Try modifying your query.',
});

const PLACEHOLDER = i18n.translate('xpack.synthetics.monitorSummary.placeholderSearch', {
  defaultMessage: 'Monitor name or tag',
});

const OTHER_MONITORS = i18n.translate('xpack.synthetics.monitorSummary.otherMonitors', {
  defaultMessage: 'Other monitors',
});
