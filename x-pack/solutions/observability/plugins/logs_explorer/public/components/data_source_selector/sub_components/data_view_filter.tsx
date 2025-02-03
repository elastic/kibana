/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewFilterHandler } from '../types';
import { DataViewsFilterParams } from '../../../state_machines/data_views';
import {
  allDataViewTypesLabel,
  logsDataViewTypeLabel,
  selectDataViewTypeLabel,
} from '../constants';

interface DataViewFilterProps {
  onFilter: DataViewFilterHandler;
  count: number;
  filter: DataViewsFilterParams;
}

const logsDataViewType = 'logs';

function getSelectedFilterLabel(dataType: DataViewsFilterParams['dataType']) {
  const availableFilters = {
    [logsDataViewType]: logsDataViewTypeLabel,
  };

  return !dataType ? allDataViewTypesLabel : availableFilters[dataType];
}

export const DataViewsFilter = ({ count, filter, onFilter }: DataViewFilterProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closeTypePopover = () => {
    setPopover(false);
  };

  const togglePopover = () => {
    setPopover(!isPopoverOpen);
  };

  const createSelectTypeFilter = (dataType: DataViewsFilterParams['dataType']) => {
    return () => {
      onFilter({ dataType });
      closeTypePopover();
    };
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {i18n.translate('xpack.logsExplorer.dataSourceSelector.dataViewCount', {
            defaultMessage: '{count, plural, one {# data view} other {# data views}}',
            values: { count },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              data-test-subj="logsExplorerDataSourceSelectorDataViewTypeButton"
              iconType="arrowDown"
              iconSide="right"
              size="xs"
              onClick={togglePopover}
            >
              {getSelectedFilterLabel(filter.dataType)}
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={closeTypePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu
            size="s"
            initialPanelId={0}
            panels={[
              {
                id: 0,
                width: 'auto',
                title: selectDataViewTypeLabel,
                items: [
                  {
                    'data-test-subj': 'logsExplorerDataSourceSelectorDataViewTypeAll',
                    icon: !filter.dataType ? 'check' : 'empty',
                    name: allDataViewTypesLabel,
                    onClick: createSelectTypeFilter(undefined),
                  },
                  {
                    'data-test-subj': 'logsExplorerDataSourceSelectorDataViewTypeLogs',
                    icon: filter.dataType === logsDataViewType ? 'check' : 'empty',
                    name: logsDataViewTypeLabel,
                    onClick: createSelectTypeFilter(logsDataViewType),
                  },
                ],
              },
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
