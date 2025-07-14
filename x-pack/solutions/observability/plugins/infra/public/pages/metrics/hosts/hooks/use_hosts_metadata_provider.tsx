/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PreferredSchemaProvider,
  usePreferredSchemaContext,
} from '../../../../hooks/use_preferred_schema';
import {
  TimeRangeMetadataProvider,
  useTimeRangeMetadataContext,
} from '../../../../hooks/use_time_range_metadata';
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
        text: schema,
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

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue) {
      updatePreferredSchema([selectedValue as 'ecs' | 'semconv']);
    }
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiSelect
            data-test-subj="infraSchemaSelectorSelect"
            id={'infraSchemaSelectorSelect'}
            options={options}
            value={preferredSchema[0] || ''}
            onChange={onChange}
            aria-label={i18n.translate(
              'xpack.infra.schemaSelector.euiSelect.useAriaLabelsWhenLabel',
              { defaultMessage: 'Use aria labels when no actual label is in use' }
            )}
            prepend={i18n.translate('xpack.infra.schemaSelector.euiSelect.prependLabel', {
              defaultMessage: 'Schema',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
