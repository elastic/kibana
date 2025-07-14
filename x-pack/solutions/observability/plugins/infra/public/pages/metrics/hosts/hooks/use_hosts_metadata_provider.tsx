/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
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

const PrependLabel = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        {i18n.translate('xpack.infra.schemaSelector.label', {
          defaultMessage: 'Schema',
        })}
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiIconTip
        content={i18n.translate('xpack.infra.schemaSelector.description', {
          defaultMessage: 'Select which data collection schema your entities are observed with.',
        })}
        position="right"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

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

  useEffect(() => {
    if (!timeRangeMetadata?.schemas?.length) {
      return;
    }

    // Only set preferred if not already set or not available
    if (!preferredSchema[0] || !timeRangeMetadata.schemas.includes(preferredSchema[0])) {
      if (timeRangeMetadata.schemas.includes('semconv')) {
        updatePreferredSchema(['semconv']);
      } else {
        updatePreferredSchema([timeRangeMetadata.schemas[0] as 'ecs' | 'semconv']);
      }
    }
  }, [updatePreferredSchema, timeRangeMetadata?.schemas, preferredSchema]);

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue) {
      updatePreferredSchema([selectedValue as 'ecs' | 'semconv']);
    }
  };
  const options = useMemo(() => {
    return (
      timeRangeMetadata?.schemas.map((schema) => ({
        text: schema,
        value: schema,
      })) || []
    );
  }, [timeRangeMetadata]);

  if (options.length <= 1) {
    // If there is only one schema available, we don't need to show the selector.
    return null;
  }

  return (
    <>
      <EuiFlexGroup direction="row" justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false}>
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
                prepend={<PrependLabel />}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
