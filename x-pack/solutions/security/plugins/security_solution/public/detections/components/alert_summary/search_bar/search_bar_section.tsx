/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useSources } from '../../../hooks/alert_summary/use_sources';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SourceFilterButton } from './sources_filter_button';
import { InputsModelId } from '../../../../common/store/inputs/constants';

export const SOURCE_BUTTON_LOADING_TEST_ID = 'alert-summary-source-button-loading';
export const SEARCH_BAR_TEST_ID = 'alert-summary-search-bar';

const SOURCE_BUTTON_LOADING_WIDTH = '120px';
const SOURCE_BUTTON_LOADING_HEIGHT = '40px';

export interface SearchBarSectionProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
}

/**
 * KQL bar at the top of the alert summary page.
 * The component leverages the Security Solution SiemSearchBar which has a lot of logic tied to url and redux to store its values.
 * The component also has a filter button to the left of the KQL bar that allows user to select sources.
 * A source is friendly UI representation of an integration. For the AI for SOC effort, each integration has one rule associated with.
 * This means that deselecting a source is equivalent to filtering out by the rule for that integration.
 */
export const SearchBarSection = memo(({ dataView, packages }: SearchBarSectionProps) => {
  const { isLoading, sources } = useSources({ packages });

  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

  return (
    <>
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle
            data-test-subj={SOURCE_BUTTON_LOADING_TEST_ID}
            isLoading={isLoading}
            width={SOURCE_BUTTON_LOADING_WIDTH}
            height={SOURCE_BUTTON_LOADING_HEIGHT}
          >
            <SourceFilterButton sources={sources} />
          </EuiSkeletonRectangle>
        </EuiFlexItem>
        <EuiFlexItem>
          <SiemSearchBar
            dataTestSubj={SEARCH_BAR_TEST_ID}
            hideFilterBar
            hideQueryMenu
            id={InputsModelId.global}
            sourcererDataView={dataViewSpec}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

SearchBarSection.displayName = 'SearchBarSection';
