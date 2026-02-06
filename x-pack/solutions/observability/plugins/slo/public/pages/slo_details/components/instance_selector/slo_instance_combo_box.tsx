/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ALL_VALUE,
  type FindSLOInstancesResponse,
  type SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useFetchSloInstances } from '../../../../hooks/use_fetch_slo_instances';

type SloInstance = FindSLOInstancesResponse['results'][number] | typeof ALL_VALUE;

const PREPEND_TEXT = i18n.translate('xpack.slo.sloDetails.instanceSelector.prependText', {
  defaultMessage: 'Instance',
});
const ERROR_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.slo.sloDetails.instanceSelector.errorPlaceholderText',
  {
    defaultMessage: 'Error loading SLO instances',
  }
);

function buildOptionLabel(groupings: SLOWithSummaryResponse['groupings']): string {
  return Object.entries(groupings)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

function buildOptions(instances: FindSLOInstancesResponse['results']): EuiComboBoxOptionOption[] {
  return instances
    .map((instance) => ({
      label: buildOptionLabel(instance.groupings),
      value: instance.instanceId,
    }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}

function buildInstanceFromSloComponents(
  instanceId: SLOWithSummaryResponse['instanceId'],
  groupings: SLOWithSummaryResponse['groupings']
): SloInstance {
  if (instanceId === ALL_VALUE) {
    return ALL_VALUE;
  }

  return {
    instanceId,
    groupings,
  };
}

export function SloInstanceComboBox({
  slo,
  setInstanceId,
}: {
  slo: SLOWithSummaryResponse;
  setInstanceId: (instanceId: string) => void;
}) {
  const [selectedInstance, setSelectedInstance] = useState<SloInstance>(
    buildInstanceFromSloComponents(slo.instanceId, slo.groupings)
  );
  const [search, setSearch] = useState<string>();
  const debouncedSearch = debounce((value) => setSearch(value), 200);

  const { isLoading, isError, data } = useFetchSloInstances({
    sloId: slo.id,
    search,
  });

  const instanceMap = useMemo(() => {
    if (!data?.results || data.results.length === 0) {
      return {};
    }

    return data.results.reduce<Record<string, FindSLOInstancesResponse['results'][number]>>(
      (acc, instance) => {
        acc[instance.instanceId] = instance;
        return acc;
      },
      {}
    );
  }, [data?.results]);
  const options = useMemo(() => buildOptions(data?.results ?? []), [data?.results]);

  useEffect(() => {
    if (slo.instanceId === ALL_VALUE) {
      setSelectedInstance(ALL_VALUE);
      return;
    }

    setSelectedInstance(buildInstanceFromSloComponents(slo.instanceId, slo.groupings));
  }, [slo.instanceId, slo.groupings]);

  if (isError) {
    return (
      <EuiComboBox
        fullWidth
        isDisabled
        singleSelection
        prepend={PREPEND_TEXT}
        aria-label={ERROR_PLACEHOLDER_TEXT}
        data-test-subj="sloDetailsInstanceSelectorComboBox-error"
        placeholder={ERROR_PLACEHOLDER_TEXT}
      />
    );
  }

  return (
    <EuiComboBox
      fullWidth
      async
      isClearable
      compressed
      prepend={PREPEND_TEXT}
      aria-label={i18n.translate('xpack.slo.sloDetails.instanceSelector.ariaLabel', {
        defaultMessage: 'Select an SLO instance',
      })}
      data-test-subj="sloDetailsInstanceSelectorComboBox"
      isLoading={isLoading}
      onChange={(selected: EuiComboBoxOptionOption[]) => {
        if (selected.length) {
          setSelectedInstance(instanceMap[selected[0].value as string]);
          setInstanceId(selected[0].value as string);
          return;
        }

        setSelectedInstance(ALL_VALUE);
        setInstanceId(ALL_VALUE);
      }}
      onSearchChange={(value: string) => debouncedSearch(value)}
      options={options}
      placeholder={i18n.translate('xpack.slo.sloDetails.instanceSelector.placeholderText', {
        defaultMessage: 'None selected, type here to search',
      })}
      selectedOptions={selectedInstance !== ALL_VALUE ? buildOptions([selectedInstance]) : []}
      singleSelection={{ asPlainText: true }}
    />
  );
}
