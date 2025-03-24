/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { generateFilters } from '@kbn/data-plugin/public';
import { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common';
import { get } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText } from '@elastic/eui';
import { FindingsBaseURLQuery, VulnerabilityGroupingMultiValueOptions } from '../../common/types';
import { useDataViewContext } from '../../common/contexts/data_view_context';
import { usePersistedQuery } from '../../common/hooks/use_cloud_posture_data_table';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { getMultiValueFieldAriaLabel } from '../../pages/vulnerabilities/translations';
import { getDefaultQuery } from '../../pages/vulnerabilities/constants';
import { PopoverTableItems } from './popover_table_items';
import { useKibana } from '../../common/hooks/use_kibana';

type URLQuery = FindingsBaseURLQuery & Record<string, any>;

const FindingsMultiValueCellRenderComponent = ({
  finding,
  multiValueField,
}: {
  finding: CspVulnerabilityFinding;
  multiValueField: VulnerabilityGroupingMultiValueOptions;
}) => {
  const { data } = useKibana().services;
  const { filterManager } = data.query;
  const { dataView } = useDataViewContext();

  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);

  const { setUrlQuery } = useUrlQuery<URLQuery>(getPersistedDefaultQuery);

  const onAddFilter = useCallback(
    (clickedField: string, values: string | string[], operation: '+' | '-') => {
      const newFilters = generateFilters(filterManager, clickedField, values, operation, dataView);
      filterManager.addFilters(newFilters);
      setUrlQuery({
        filters: filterManager.getFilters(),
      });
    },
    [dataView, filterManager, setUrlQuery]
  );

  const value = get(multiValueField, finding);
  if (!Array.isArray(value)) {
    return <>{value || '-'}</>;
  }

  const renderItem = (item: string, i: number, field: string) => (
    <EuiBadge
      onClickAriaLabel={getMultiValueFieldAriaLabel(item, i)}
      onClick={() => onAddFilter(field, item, '+')}
      color="hollow"
      key={`${item}-${i}`}
      data-test-subj={`multi-value-badge-${item}`}
    >
      <EuiText size="m">{item}</EuiText>
    </EuiBadge>
  );

  return (
    <EuiFlexGroup wrap={false} responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{value[0]}</EuiFlexItem>
      {value.length > 1 && (
        <EuiFlexItem grow={false}>
          <PopoverTableItems items={value} renderItem={renderItem} field={multiValueField} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const MemoizedFindingsMultiValueCellRenderComponent = React.memo(
  FindingsMultiValueCellRenderComponent
);
MemoizedFindingsMultiValueCellRenderComponent.displayName = 'FindingsMultiValueCellRenderComponent';

export const FindingsMultiValueCellRender =
  MemoizedFindingsMultiValueCellRenderComponent as typeof FindingsMultiValueCellRenderComponent;
