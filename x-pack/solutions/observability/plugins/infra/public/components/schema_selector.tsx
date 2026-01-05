/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSuperSelect,
  EuiText,
  EuiToken,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DataSchemaFormatEnum,
  type DataSchemaFormat,
} from '@kbn/metrics-data-access-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const SCHEMA_NOT_AVAILABLE = i18n.translate('xpack.infra.schemaSelector.notAvailable', {
  defaultMessage: 'Selected schema is not available for this query.',
});

const SCHEMA_DOCUMENTATION_LINK = 'https://ela.st/docs-otel-schema-selector-hosts';

const PrependLabel = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.infra.schemaSelector.label', {
              defaultMessage: 'Schema',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              data-test-subj="infraSchemaSelectorHelpButton"
              aria-label={i18n.translate('xpack.infra.schemaSelector.helpButton.ariaLabel', {
                defaultMessage: 'See schema documentation',
              })}
              size="s"
              onClick={() => setIsPopoverOpen((popoverValue) => !popoverValue)}
            >
              <EuiIcon type="question" color="text" />
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="rightCenter"
        >
          <FormattedMessage
            id="xpack.infra.schemaSelector.description"
            defaultMessage="Select which data collection schema your entities are observed with.{nextLine} See {documentation} for more information."
            values={{
              nextLine: <br />,
              documentation: (
                <EuiLink
                  data-test-subj="infraSchemaSelectorDocumentationLink"
                  href={SCHEMA_DOCUMENTATION_LINK}
                  target="_blank"
                >
                  {i18n.translate('xpack.infra.schemaSelector.documentation', {
                    defaultMessage: 'documentation',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
export const schemaTranslationMap = {
  [DataSchemaFormatEnum.ECS]: i18n.translate('xpack.infra.schemaSelector.ecsDisplay', {
    defaultMessage: 'Elastic System Integration',
  }),
  [DataSchemaFormatEnum.SEMCONV]: i18n.translate('xpack.infra.schemaSelector.semconvDisplay', {
    defaultMessage: 'OpenTelemetry',
  }),
};

const getInputDisplay = (schema: DataSchemaFormat | null) => {
  const translation = schema ? schemaTranslationMap[schema] : null;
  if (translation) {
    return translation;
  }
  return i18n.translate('xpack.infra.schemaSelector.unknownDisplay', {
    defaultMessage: 'Unknown schema',
  });
};

type SelectOptions = DataSchemaFormat | 'unknown';

export const SchemaSelector = ({
  onChange,
  schemas,
  value,
  isLoading,
  isHostsView = false,
}: {
  onChange: (selected: DataSchemaFormat) => void;
  schemas: DataSchemaFormat[];
  value: DataSchemaFormat;
  isLoading: boolean;
  isHostsView?: boolean;
}) => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { euiTheme } = useEuiTheme();
  const options = useMemo(
    () =>
      schemas.map((schema) => ({
        inputDisplay: getInputDisplay(schema),
        value: schema,
      })),
    [schemas]
  );
  // Is the selected value in the available options?
  const isInvalid = useMemo(
    () => !!value && !options.some((opt) => opt.value === value),
    [value, options]
  );

  // If only one schema is available and it's not the preferred, show both in the dropdown
  const displayOptions = useMemo<EuiSuperSelectOption<SelectOptions>[]>(
    () =>
      options.length === 1 && isInvalid
        ? [
            {
              inputDisplay: <InvalidDisplay value={getInputDisplay(value)} />,
              value: 'unknown',
              disabled: true,
              dropdownDisplay: <InvalidDropdownDisplay value={getInputDisplay(value)} />,
            },
            ...options,
          ]
        : options.length === 0
        ? [
            {
              inputDisplay: i18n.translate('xpack.infra.schemaSelector.noSchemaAvailable', {
                defaultMessage: 'No schema available',
              }),
              value: 'unknown',
            },
          ]
        : options,
    [isInvalid, options, value]
  );

  const onSelect = useCallback(
    (selectedValue: SelectOptions) => {
      if (selectedValue !== 'unknown') {
        onChange(selectedValue);
        telemetry.reportSchemaSelectorInteraction({
          interaction: 'select schema',
          schema_selected: selectedValue,
          schemas_available: schemas,
        });
      }
    },
    [onChange, schemas, telemetry]
  );

  const handleSchemaSelectorClick = useCallback(() => {
    telemetry.reportSchemaSelectorInteraction({
      interaction: 'open dropdown',
      schema_selected: value,
      schemas_available: schemas,
    });
  }, [value, schemas, telemetry]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={0}>
        <EuiFormRow
          aria-label={i18n.translate('xpack.infra.schemaSelector.select.ariaLabel', {
            defaultMessage: 'Schema selector for data collection',
          })}
          css={{ minWidth: isHostsView ? '400px' : '300px' }}
          helpText={
            (options.length > 1 || (options.length === 1 && isInvalid)) &&
            i18n.translate('xpack.infra.schemaSelector.select.helpText', {
              defaultMessage: 'There are hosts available in another schema',
            })
          }
        >
          <EuiSuperSelect
            onClickCapture={handleSchemaSelectorClick}
            data-test-subj="infraSchemaSelect"
            id="infraSchemaSelectorSelect"
            options={displayOptions}
            compressed
            valueOfSelected={isInvalid ? 'unknown' : value ?? 'semconv'}
            onChange={onSelect}
            isLoading={isLoading}
            fullWidth
            css={{
              fontSize: useEuiFontSize('xs').fontSize,
              fontWeight: euiTheme.font.weight.medium,
            }}
            prepend={<PrependLabel />}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
