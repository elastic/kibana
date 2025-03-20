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
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useFindRulesQuery } from '../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SourceFilterButton } from './sources_filter_button';
import { InputsModelId } from '../../../../common/store/inputs/constants';

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
 * The component leverages the Security Solution SiemSearchBar which has
 * a lot of logic tied to url and redux to store its values.
 * The component also has a filter button to the left of the KQL bar that allows user to select sources. A source is a
 * effectively an integration. More precisely, selecting a source is equivalent to filtering by the corresponding rule for that integration.
 */
export const SearchBarSection = memo(({ dataView, packages }: SearchBarSectionProps) => {
  const { data, isLoading } = useFindRulesQuery({});
  console.log('data', data);

  // Converting rule data into a interface that a EuiFilterButton can take as input.
  // We are fetching all the rules // TODO
  // By default, all sources are selected
  const sources: EuiSelectableOption[] = useMemo(
    () =>
      packages.map((p: PackageListItem) => {
        const matchingRule = (data?.rules || []).find((r: RuleResponse) =>
          r.related_integrations.map((ri) => ri.package).includes(p.name)
        );

        return {
          label: p.title,
          key: matchingRule?.name,
          checked: 'on',
        };
      }),
    [data?.rules, packages]
  );

  const dataViewSpec = useMemo(() => dataView.toSpec(), [dataView]);

  return (
    <>
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle isLoading={isLoading} width="120px" height="40px">
            <SourceFilterButton sources={sources} />
          </EuiSkeletonRectangle>
        </EuiFlexItem>
        <EuiFlexItem>
          <SiemSearchBar
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
