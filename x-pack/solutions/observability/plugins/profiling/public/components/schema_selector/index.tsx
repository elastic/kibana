/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  EuiToken,
  EuiToolTip,
  useEuiFontSize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProfilingSchema } from '@kbn/profiling-utils';

const SCHEMA_LABEL = i18n.translate('xpack.profiling.schemaSelector.label', {
  defaultMessage: 'Schema',
});

const SCHEMA_NOT_AVAILABLE = i18n.translate('xpack.profiling.schemaSelector.notAvailable', {
  defaultMessage: 'Selected schema is not available for this query.',
});

const OTHER_SCHEMA_AVAILABLE = i18n.translate(
  'xpack.profiling.schemaSelector.otherSchemaAvailableHelpText',
  { defaultMessage: 'There is profiling data available in another schema' }
);

const AVAILABILITY_ERROR = i18n.translate(
  'xpack.profiling.schemaSelector.availabilityErrorHelpText',
  {
    defaultMessage: 'Unable to check which schemas have data',
  }
);

const schemaTranslationMap: Readonly<Record<ProfilingSchema, string>> = {
  [ProfilingSchema.ECS]: i18n.translate('xpack.profiling.schemaSelector.ecsDisplay', {
    defaultMessage: 'Universal Profiling',
  }),
  [ProfilingSchema.OTEL]: i18n.translate('xpack.profiling.schemaSelector.otelDisplay', {
    defaultMessage: 'OpenTelemetry',
  }),
};

// Placeholder option, shown for unavailable or missing schemas, that is never selected
const UNKNOWN_OPTION = 'unknown';

type SelectOption = ProfilingSchema | typeof UNKNOWN_OPTION;

const InvalidDropdownDisplay = ({ value }: { value: string }) => (
  <>
    <EuiText size="s">{value}</EuiText>
    <EuiText size="xs">{SCHEMA_NOT_AVAILABLE}</EuiText>
  </>
);

const InvalidDisplay = ({ value }: { value: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem>
      <EuiText size="s">{value}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip position="top" content={SCHEMA_NOT_AVAILABLE}>
        <EuiToken
          iconType="warning"
          tabIndex={0}
          size="s"
          color="euiColorVis9"
          data-test-subj="profilingSchemaSelectorInvalidToken"
          shape="square"
          fill="dark"
          aria-label={SCHEMA_NOT_AVAILABLE}
          title={i18n.translate('xpack.profiling.schemaSelector.invalidSchemaWarningTitle', {
            defaultMessage: 'Invalid schema warning',
          })}
          css={{ verticalAlign: 'text-bottom' }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const getHelpText = ({
  schemas,
  isInvalid,
  hasAvailabilityError,
}: {
  schemas?: ProfilingSchema[];
  isInvalid: boolean;
  hasAvailabilityError: boolean;
}): string | undefined => {
  if (hasAvailabilityError) {
    return AVAILABILITY_ERROR;
  }

  if (schemas && (schemas.length > 1 || (schemas.length === 1 && isInvalid))) {
    return OTHER_SCHEMA_AVAILABLE;
  }

  return undefined;
};

export function SchemaSelector({
  value,
  schemas,
  supportedSchemas,
  isLoading,
  hasAvailabilityError,
  onChange,
}: {
  value: ProfilingSchema;
  /** Schemas with data, undefined while unknown. */
  schemas?: ProfilingSchema[];
  /** Schemas offered while the ones with data are unknown. */
  supportedSchemas: ProfilingSchema[];
  isLoading: boolean;
  hasAvailabilityError: boolean;
  onChange: (schema: ProfilingSchema) => void;
}) {
  const { fontSize } = useEuiFontSize('s');

  const offeredSchemas = schemas ?? supportedSchemas;

  const options = useMemo<Array<EuiSuperSelectOption<SelectOption>>>(
    () =>
      offeredSchemas.map((schema) => ({
        inputDisplay: schemaTranslationMap[schema],
        value: schema,
      })),
    [offeredSchemas]
  );

  const isInvalid = !offeredSchemas.includes(value);

  const displayOptions = useMemo<Array<EuiSuperSelectOption<SelectOption>>>(() => {
    if (options.length === 0) {
      return [
        {
          inputDisplay: i18n.translate('xpack.profiling.schemaSelector.noSchemaAvailable', {
            defaultMessage: 'No schema available',
          }),
          value: UNKNOWN_OPTION,
        },
      ];
    }

    if (isInvalid) {
      return [
        {
          inputDisplay: <InvalidDisplay value={schemaTranslationMap[value]} />,
          dropdownDisplay: <InvalidDropdownDisplay value={schemaTranslationMap[value]} />,
          value: UNKNOWN_OPTION,
          disabled: true,
        },
        ...options,
      ];
    }

    return options;
  }, [isInvalid, options, value]);

  const onSelect = useCallback(
    (selectedValue: SelectOption) => {
      if (selectedValue !== UNKNOWN_OPTION) {
        onChange(selectedValue);
      }
    },
    [onChange]
  );

  return (
    <EuiFormRow
      aria-label={i18n.translate('xpack.profiling.schemaSelector.ariaLabel', {
        defaultMessage: 'Schema selector for profiling data',
      })}
      css={{ minWidth: '300px' }}
      helpText={getHelpText({ schemas, isInvalid, hasAvailabilityError })}
    >
      <EuiSuperSelect
        data-test-subj="profilingSchemaSelect"
        id="profilingSchemaSelectorSelect"
        options={displayOptions}
        compressed
        valueOfSelected={isInvalid ? UNKNOWN_OPTION : value}
        onChange={onSelect}
        isLoading={isLoading}
        disabled={isLoading}
        fullWidth
        css={{ fontSize }}
        prepend={<EuiFormLabel>{SCHEMA_LABEL}</EuiFormLabel>}
      />
    </EuiFormRow>
  );
}
