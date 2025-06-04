/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PreferredSchemaProvider,
  usePreferredSchemaContext,
} from '../../../../hooks/use_preferred_schema';
import {
  TimeRangeMetadataProvider,
  useTimeRangeMetadataContext,
} from '../../../../hooks/use_timerange_metadata';
import { useUnifiedSearch } from './use_unified_search';
export function HostsTimeRangeMetadataProvider({ children }: { children: React.ReactNode }) {
  const { parsedDateRange } = useUnifiedSearch();

  return (
    <TimeRangeMetadataProvider
      dataSource="host"
      start={parsedDateRange.from}
      end={parsedDateRange.to}
    >
      <PreferredSchemaProvider>
        <SchemaSelector />
        {children}
      </PreferredSchemaProvider>
    </TimeRangeMetadataProvider>
  );
}

export const SchemaSelector = () => {
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();
  const { preferredSchema, updatePreferredSchema } = usePreferredSchemaContext();

  const options = useMemo(() => {
    return (
      timeRangeMetadata?.schemas.map((schema) => ({
        label: schema,
        value: schema,
      })) || []
    );
  }, [timeRangeMetadata]);

  useEffect(() => {
    if (!timeRangeMetadata?.schemas?.length) {
      return;
    }

    updatePreferredSchema(timeRangeMetadata.schemas);
  }, [updatePreferredSchema, timeRangeMetadata?.schemas]);

  const selectedOptions = useMemo(
    () => options.filter((option) => preferredSchema?.includes(option.value)),
    [options, preferredSchema]
  );

  const onChange = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (changedOptions.length > 0) {
      updatePreferredSchema(
        changedOptions.map((option) => option.value!) as Array<'ecs' | 'semconv'>
      );
      return;
    }
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiComboBox
            aria-label={i18n.translate(
              'xpack.infra.schemaSelector.selectschemaComboBox.ariaLabel',
              {
                defaultMessage: 'Select schema',
              }
            )}
            placeholder={i18n.translate('xpack.infra.hosts.schemaSelector.placeholder', {
              defaultMessage: 'Select schema',
            })}
            options={options}
            selectedOptions={selectedOptions}
            isClearable={true}
            data-test-subj="schemaSelector"
            onChange={onChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
