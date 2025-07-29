/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { HostsState } from '../pages/metrics/hosts/hooks/use_unified_search_url_state';

const SCHEMA_NOT_AVAILABLE = i18n.translate('xpack.infra.schemaSelector.notAvailable', {
  defaultMessage: 'Selected schema is not available for this query.',
});

const PrependLabel = ({ count }: { count: number }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        {i18n.translate('xpack.infra.schemaSelector.label', {
          defaultMessage: 'Schema',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge
        color="primary"
        data-test-subj="infraSchemaSelectorCount"
        aria-label={i18n.translate('xpack.infra.schemaSelector.count', {
          defaultMessage: 'Schemas available',
        })}
      >
        {count}
      </EuiBadge>
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

const InvalidDropdownDisplay = ({ value }: { value: string }) => {
  return (
    <>
      <EuiText size="s">{value}</EuiText>
      <EuiText size="xs">{SCHEMA_NOT_AVAILABLE}</EuiText>
    </>
  );
};

const InvalidDisplay = ({ value }: { value: string }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiText size="s">{value}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={SCHEMA_NOT_AVAILABLE}>
          <EuiToken
            iconType="alert"
            tabIndex={0}
            size="s"
            color="euiColorVis9"
            data-test-subj="infraSchemaSelectorInvalidToken"
            shape="square"
            fill="dark"
            aria-label={SCHEMA_NOT_AVAILABLE}
            title={i18n.translate('xpack.infra.invalidDisplay.euiIcon.iconWithTooltipLabel', {
              defaultMessage: 'Invalid schema warning',
            })}
            css={{
              verticalAlign: 'text-bottom',
            }}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
const schemaTranslationMap = {
  [DataSchemaFormat.ECS]: i18n.translate('xpack.infra.schemaSelector.ecsDisplay', {
    defaultMessage: 'Elastic System Integration',
  }),
  [DataSchemaFormat.SEMCONV]: i18n.translate('xpack.infra.schemaSelector.semconvDisplay', {
    defaultMessage: 'OpenTelemetry',
  }),
};

const getInputDisplay = (schema: DataSchemaFormat) => {
  const translation = schemaTranslationMap[schema];
  if (translation) {
    return translation;
  }
  return i18n.translate('xpack.infra.schemaSelector.unknownDisplay', {
    defaultMessage: 'Unknown schema',
  });
};

export const SchemaSelector = ({
  onChange,
  schemas,
  value,
  isLoading,
}: {
  onChange: (selected: HostsState['preferredSchema']) => void;
  schemas: DataSchemaFormat[];
  value: DataSchemaFormat | null;
  isLoading: boolean;
}) => {
  const options = useMemo(
    () =>
      schemas.map((schema) => ({
        inputDisplay: getInputDisplay(schema),
        value: schema,
      })),
    [schemas]
  );
  // Is the selected value in the available options?
  const isInvalid = !!value && !options.some((opt) => opt.value === value);

  // If only one schema is available and it's not the preferred, show both in the dropdown
  const displayOptions =
    options.length === 1 && isInvalid
      ? [
          {
            inputDisplay: <InvalidDisplay value={getInputDisplay(value)} />,
            value,
            disabled: true,
            dropdownDisplay: <InvalidDropdownDisplay value={getInputDisplay(value)} />,
          },
          ...options,
        ]
      : options;

  const onSelect = (selectedValue: string) => {
    if (selectedValue) {
      onChange(selectedValue as HostsState['preferredSchema']);
    }
  };

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFormRow
                aria-label={i18n.translate('xpack.infra.schemaSelector.select.ariaLabel', {
                  defaultMessage: 'Schema selector for data collection',
                })}
                css={{ minWidth: '356px' }}
              >
                <EuiSuperSelect
                  data-test-subj="infraSchemaSelect"
                  id={'infraSchemaSelectorSelect'}
                  options={displayOptions}
                  valueOfSelected={value || ''}
                  onChange={onSelect}
                  isLoading={isLoading}
                  fullWidth
                  prepend={<PrependLabel count={schemas.length} />}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
