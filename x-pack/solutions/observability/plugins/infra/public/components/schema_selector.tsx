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
import type { HostsState } from '../pages/metrics/hosts/hooks/use_unified_search_url_state';

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
      <EuiBadge color="primary" data-test-subj="infraSchemaSelectorCount">
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
      <EuiText size="xs">
        {i18n.translate('xpack.infra.schemaSelector.invalid', {
          defaultMessage: 'Selected schema is not available for this query.',
        })}
      </EuiText>
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
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.infra.schemaSelector.invalidTooltip', {
            defaultMessage: 'Selected schema is not available for this query.',
          })}
        >
          <EuiToken
            iconType="alert"
            tabIndex={0}
            size="s"
            color="euiColorVis9"
            data-test-subj="infraSchemaSelectorInvalidToken"
            aria-label={i18n.translate('xpack.infra.schemaSelector.invalidAriaLabel', {
              defaultMessage: 'Invalid schema token',
            })}
            shape="square"
            fill="dark"
            title={i18n.translate('xpack.infra.invalidDisplay.euiIcon.iconWithTooltipLabel', {
              defaultMessage: 'Invalid schema token',
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

const getInputDisplay = (schema: string) => {
  if (schema === 'ecs') {
    return i18n.translate('xpack.infra.schemaSelector.ecsDisplay', {
      defaultMessage: 'Elastic System Integration',
    });
  }
  if (schema === 'semconv') {
    return i18n.translate('xpack.infra.schemaSelector.semconvDisplay', {
      defaultMessage: 'OpenTelemetry',
    });
  }
  return schema;
};

export const SchemaSelector = ({
  onChange,
  schemas,
  value,
}: {
  onChange: (selected: HostsState['preferredSchema']) => void;
  schemas: string[];
  value: string | null;
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
  let displayOptions;
  if (options.length === 1 && isInvalid && value) {
    displayOptions = [
      {
        inputDisplay: <InvalidDisplay value={getInputDisplay(value)} />,
        value,
        disabled: true,
        dropdownDisplay: <InvalidDropdownDisplay value={getInputDisplay(value)} />,
      },
      ...options,
    ];
  } else {
    displayOptions = options;
  }

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
                  defaultMessage: 'Schema select',
                })}
                css={{ minWidth: '356px' }}
              >
                <EuiSuperSelect
                  data-test-subj="infraSchemaSelect"
                  id={'infraSchemaSelectorSelect'}
                  options={displayOptions}
                  valueOfSelected={value === null ? '' : value}
                  onChange={onSelect}
                  isLoading={!schemas.length}
                  fullWidth
                  aria-label={i18n.translate('xpack.infra.schemaSelector.ariaLabel', {
                    defaultMessage: 'Select schema for data collection',
                  })}
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
