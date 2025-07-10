/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiSelect, EuiText } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { sloAppId } from '../../../../../common';
import { SUMMARY_DESTINATION_INDEX_NAME } from '../../../../../common/constants';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useFetchSloGroups } from '../../../../hooks/use_fetch_slo_groups';
import { SLI_OPTIONS } from '../../../../pages/slo_edit/constants';
import { useGetSettings } from '../../../../pages/slo_settings/hooks/use_get_settings';
import { useKibana } from '../../../../hooks/use_kibana';
import type { GroupBy, GroupFilters } from '../types';

interface Option {
  value: string;
  text: string;
}

interface Props {
  onSelected: (prop: string, value: string | Array<string | undefined> | Filter[]) => void;
  selectedFilters: GroupFilters;
}

const mapGroupsToOptions = (groups: string[] | undefined, selectedGroupBy: string) =>
  groups?.map((group) => {
    let label = group;
    if (selectedGroupBy === 'status') {
      label = group.toLowerCase();
    } else if (selectedGroupBy === 'slo.indicator.type') {
      label = SLI_OPTIONS.find((option) => option.value === group)!.text ?? group;
    }
    return {
      label,
      value: group,
    };
  }) ?? [];

export function SloGroupFilters({ selectedFilters, onSelected }: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;
  const { data: settings } = useGetSettings();

  const hasRemoteEnabled =
    settings && (settings.useAllRemoteClusters || settings.selectedRemoteClusters.length > 0);

  const groupByOptions: Option[] = [
    {
      text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.tags', {
        defaultMessage: 'Tags',
      }),
      value: 'slo.tags',
    },
    {
      text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.status', {
        defaultMessage: 'Status',
      }),
      value: 'status',
    },
    {
      text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.sliType', {
        defaultMessage: 'SLI type',
      }),
      value: 'slo.indicator.type',
    },
    ...(hasRemoteEnabled
      ? [
          {
            text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.remoteCluster', {
              defaultMessage: 'Remote cluster',
            }),
            value: '_index',
          },
        ]
      : []),
  ];
  const { dataView } = useCreateDataView({
    indexPatternString: SUMMARY_DESTINATION_INDEX_NAME,
  });
  const [selectedGroupBy, setSelectedGroupBy] =
    useState<GroupBy>(selectedFilters.groupBy) ?? 'status';
  const [filters, setFilters] = useState(selectedFilters.filters) ?? [];
  const [kqlQuery, setkqlQuery] = useState(selectedFilters.kqlQuery);
  const [selectedGroupByLabel, setSelectedGroupByLabel] = useState('Status');
  const [groupOptions, setGroupOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(mapGroupsToOptions(selectedFilters.groups, selectedGroupBy));
  const [searchValue, setSearchValue] = useState<string>('');
  const sliTypeSearch = SLI_OPTIONS.find((option) =>
    option.text.toLowerCase().includes(searchValue.toLowerCase())
  )?.value;
  const query = `${searchValue}*`;

  const { data, isLoading } = useFetchSloGroups({
    perPage: 100,
    groupBy: selectedGroupBy,
    kqlQuery: `slo.tags: (${query}) or status: (${query.toUpperCase()}) or slo.indicator.type: (${sliTypeSearch})`,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && data?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapGroupsToOptions(
          data?.results.map((item) => item.group),
          selectedGroupBy
        )
      : [];
    setGroupOptions(opts);

    if (selectedGroupBy === 'slo.tags') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.tagsLabel', {
          defaultMessage: 'Tags',
        })
      );
    } else if (selectedGroupBy === 'status') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.statusLabel', {
          defaultMessage: 'Status',
        })
      );
    } else if (selectedGroupBy === 'slo.indicator.type') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.sliTypeLabel', {
          defaultMessage: 'SLI type',
        })
      );
    } else if (selectedGroupBy === '_index') {
      setSelectedGroupByLabel(
        i18n.translate('xpack.slo.sloGroupConfiguration.remoteClusterLabel', {
          defaultMessage: 'Remote cluster',
        })
      );
    }
  }, [isLoading, data, selectedGroupBy]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedGroupOptions(opts);
    const selectedGroups = opts.length >= 1 ? opts.map((opt) => opt.value) : [];
    onSelected('groups', selectedGroups);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupTypeLabel', {
          defaultMessage: 'Group by',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="sloGroupOverviewConfigurationGroupBy"
          options={groupByOptions}
          value={selectedGroupBy}
          onChange={(e) => {
            setSelectedGroupBy(e.target.value as GroupBy);
            onSelected('groupBy', e.target.value);
            setSelectedGroupOptions([]);
            onSelected('groups', []);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupByLabel', {
          defaultMessage: '{ selectedGroupByLabel }',
          values: { selectedGroupByLabel },
        })}
        labelAppend={
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.slo.sloGroupConfiguration.groupsOptional"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.slo.sloGroupConfiguration.sloSelector.ariaLabel', {
            defaultMessage: '{ selectedGroupByLabel }',
            values: { selectedGroupByLabel },
          })}
          placeholder={i18n.translate('xpack.slo.sloGroupConfiguration.sloSelector.placeholder', {
            defaultMessage: 'Select a {selectedGroupByLabel}',
            values: { selectedGroupByLabel },
          })}
          data-test-subj="sloGroupOverviewConfigurationGroup"
          options={groupOptions}
          selectedOptions={selectedGroupOptions}
          async
          onChange={onChange}
          onSearchChange={onSearchChange}
          fullWidth
          singleSelection={false}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.customFiltersLabel', {
          defaultMessage: 'Custom filter',
        })}
        labelAppend={
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.slo.sloGroupConfiguration.customFiltersOptional"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
        <SearchBar
          dataTestSubj="sloGroupOverviewConfigurationKqlBar"
          appName={sloAppId}
          placeholder={PLACEHOLDER}
          indexPatterns={dataView ? [dataView] : []}
          showSubmitButton={false}
          showFilterBar={true}
          filters={filters}
          onFiltersUpdated={(newFilters) => {
            setFilters(newFilters);
            onSelected('filters', newFilters);
          }}
          onQuerySubmit={({ query: value }) => {
            setkqlQuery(String(value?.query));
            onSelected('kqlQuery', String(value?.query));
          }}
          onQueryChange={({ query: value }) => {
            setkqlQuery(String(value?.query));
            onSelected('kqlQuery', String(value?.query));
          }}
          query={{ query: String(kqlQuery), language: 'kuery' }}
          showDatePicker={false}
          disableQueryLanguageSwitcher={true}
          allowSavingQueries
          onClearSavedQuery={() => {}}
          showQueryInput={true}
          onSavedQueryUpdated={(savedQuery) => {
            setFilters(savedQuery.attributes.filters);
            setkqlQuery(String(savedQuery.attributes.query.query));
          }}
        />
      </EuiFormRow>
    </>
  );
}

const PLACEHOLDER = i18n.translate('xpack.slo.sloGroupConfiguration.customFilterText', {
  defaultMessage: 'Custom filter',
});
