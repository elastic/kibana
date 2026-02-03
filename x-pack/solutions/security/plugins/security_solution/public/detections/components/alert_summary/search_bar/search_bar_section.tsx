/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useIntegrations } from '../../../hooks/alert_summary/use_integrations';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { IntegrationFilterButton } from './integrations_filter_button';
import { InputsModelId } from '../../../../common/store/inputs/constants';

export const SEARCH_BAR_TEST_ID = 'alert-summary-search-bar';

export interface SearchBarSectionProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

/**
 * KQL bar at the top of the alert summary page.
 * The component leverages the Security Solution SiemSearchBar which has a lot of logic tied to url and redux to store its values.
 * The component also has a filter button to the left of the KQL bar that allows user to select integrations.
 */
export const SearchBarSection = memo(({ dataView, packages }: SearchBarSectionProps) => {
  const { integrations } = useIntegrations({ packages });

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <IntegrationFilterButton integrations={integrations} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SiemSearchBar
          dataTestSubj={SEARCH_BAR_TEST_ID}
          dataView={dataView}
          hideFilterBar
          hideQueryMenu
          id={InputsModelId.global}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SearchBarSection.displayName = 'SearchBarSection';
