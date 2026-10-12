/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataViewPicker } from '../../data_view_manager/components/data_view_picker';
import { PageScope } from '../../data_view_manager/constants';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SiemSearchBar } from '../../common/components/search_bar';

/**
 * Data-view picker + KQL bar + date range, in its own subdued background
 */
export const SearchWithDataView: React.FC<{ dataView: DataView }> = ({ dataView }) => {
  const { euiTheme } = useEuiTheme();
  const sectionStyles = css`
    margin-inline: -${euiTheme.size.l};
    padding-block: ${euiTheme.size.s};
    padding-left: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    min-width: 0;
  `;
  const searchBarItemStyles = css`
    min-width: 0;
  `;
  // Match the search bar's padding-top so the picker lines up with it
  const dataViewPickerStyles = css`
    padding-top: ${euiTheme.size.s};
  `;

  return (
    <div css={sectionStyles}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false} css={dataViewPickerStyles}>
          <DataViewPicker scope={PageScope.explore} />
        </EuiFlexItem>
        <EuiFlexItem css={searchBarItemStyles}>
          <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
