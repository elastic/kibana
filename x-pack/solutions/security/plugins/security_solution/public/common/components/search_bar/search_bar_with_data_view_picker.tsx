/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { InputsModelId } from '../../store/inputs/constants';
import { SiemSearchBar } from '.';
import { DataViewPicker } from '../../../data_view_manager/components/data_view_picker';
import type { PageScope } from '../../../data_view_manager/constants';

export const DATA_VIEW_PICKER_TEST_ID = 'security-search-bar-data-view-picker';

export interface SearchBarWithDataViewPickerProps {
  /** DataView to pass to the global search bar */
  dataView: DataView;
  /** Data view manager scope the picker reads/writes */
  scope: PageScope;
  /** Redux inputs id the search bar reads/writes its query and time range from */
  id: InputsModelId.global | InputsModelId.timeline;
  /** Disables the data view picker, keeping it visible but read-only */
  disabled?: boolean;
  /** `data-test-subj` forwarded to the search bar */
  dataTestSubj?: string;
}

/**
 * Data view picker next to the KQL search bar, rendered inline (not portaled like the legacy
 * `FiltersGlobal` pattern) so the caller can place it anywhere, e.g. below `AppHeader`.
 */
export const SearchBarWithDataViewPicker = memo(
  ({ dataView, scope, id, disabled, dataTestSubj }: SearchBarWithDataViewPickerProps) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem
          grow={false}
          data-test-subj={DATA_VIEW_PICKER_TEST_ID}
          css={css`
            padding: ${euiTheme.size.s} 0;
          `}
        >
          <DataViewPicker scope={scope} disabled={disabled} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SiemSearchBar dataTestSubj={dataTestSubj} dataView={dataView} id={id} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

SearchBarWithDataViewPicker.displayName = 'SearchBarWithDataViewPicker';
