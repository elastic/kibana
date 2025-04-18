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
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useIntegrations } from '../../../hooks/alert_summary/use_integrations';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { IntegrationFilterButton } from './integrations_filter_button';
import { InputsModelId } from '../../../../common/store/inputs/constants';

export const INTEGRATION_BUTTON_LOADING_TEST_ID = 'alert-summary-integration-button-loading';
export const SEARCH_BAR_TEST_ID = 'alert-summary-search-bar';

const INTEGRATION_BUTTON_LOADING_WIDTH = '120px';
const INTEGRATION_BUTTON_LOADING_HEIGHT = '40px';

export interface SearchBarSectionProps {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView;
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Result from the useQuery to fetch all rules
   */
  ruleResponse: {
    /**
     * Result from fetching all rules
     */
    rules: RuleResponse[];
    /**
     * True while rules are being fetched
     */
    isLoading: boolean;
  };
}

/**
 * KQL bar at the top of the alert summary page.
 * The component leverages the Security Solution SiemSearchBar which has a lot of logic tied to url and redux to store its values.
 * The component also has a filter button to the left of the KQL bar that allows user to select integrations.
 * For the AI for SOC effort, each integration has one rule associated with.
 * This means that deselecting an integration is equivalent to filtering out by the rule for that integration.
 */
export const SearchBarSection = memo(
  ({ dataView, packages, ruleResponse }: SearchBarSectionProps) => {
    const { isLoading, integrations } = useIntegrations({ packages, ruleResponse });

    const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

    return (
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle
            data-test-subj={INTEGRATION_BUTTON_LOADING_TEST_ID}
            isLoading={isLoading}
            width={INTEGRATION_BUTTON_LOADING_WIDTH}
            height={INTEGRATION_BUTTON_LOADING_HEIGHT}
          >
            <IntegrationFilterButton integrations={integrations} />
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
    );
  }
);

SearchBarSection.displayName = 'SearchBarSection';
