/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableProps, EuiSelectableOption } from '@elastic/eui';
import {
  useEuiTheme,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiSelectable,
  EuiPopoverTitle,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useBasePath, useKibana } from '../../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../../common/lib/telemetry/events/siem_readiness/types';

interface StatusInfo {
  status: string;
  badgeColor: string;
  tooltip: string;
}

interface IntegrationSelectablePopoverProps extends Pick<EuiSelectableProps, 'options'> {
  showOnlySelectable?: boolean;
  statusMap?: Map<string, StatusInfo>;
  disabled?: boolean;
  telemetrySource?: string;
}

export const IntegrationSelectablePopover = (props: IntegrationSelectablePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { options, showOnlySelectable, statusMap, disabled = false, telemetrySource = '' } = props;
  const { euiTheme } = useEuiTheme();
  const basePath = useBasePath();
  const { telemetry } = useKibana().services;

  const handleChange: EuiSelectableProps['onChange'] = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedOption = newOptions.find((option) => option.checked === 'on');

      if (selectedOption?.key) {
        telemetry.reportEvent(SiemReadinessEventTypes.IntegrationClicked, {
          integrationPackage: selectedOption.key,
          source: telemetrySource,
        });
        const integrationUrl = `${basePath}/app/integrations/detail/${selectedOption.key}`;
        window.open(integrationUrl, '_blank', 'noopener,noreferrer');
        setIsPopoverOpen(false);
      }
    },
    [basePath, telemetry, telemetrySource]
  );

  const handlePopoverOpen = useCallback(() => {
    telemetry.reportEvent(SiemReadinessEventTypes.IntegrationPopoverOpened, {
      source: telemetrySource,
    });
    setIsPopoverOpen(true);
  }, [telemetry, telemetrySource]);

  const renderOption = (option: EuiSelectableOption) => {
    const statusInfo = statusMap?.get(option.key as string);
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {statusInfo && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={statusInfo.tooltip}>
              <EuiBadge tabIndex={0} color={statusInfo.badgeColor}>
                {statusInfo.status}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <span>{option.label}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const selectableComponent = (
    <EuiSelectable
      aria-label={i18n.translate(
        'xpack.securitySolution.siemReadiness.integrationSelectablePopover.ariaLabel',
        {
          defaultMessage: 'Select integration to see details',
        }
      )}
      searchable
      singleSelection="always"
      searchProps={{
        placeholder: i18n.translate(
          'xpack.securitySolution.siemReadiness.integrationSelectablePopover.searchPlaceholder',
          {
            defaultMessage: 'Filter list',
          }
        ),
        compressed: true,
      }}
      listProps={{
        showIcons: false,
      }}
      options={options}
      onChange={handleChange}
      renderOption={renderOption}
    >
      {(list, search) => (
        <div style={{ width: '375px' }}>
          <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
          {list}
        </div>
      )}
    </EuiSelectable>
  );

  if (showOnlySelectable) {
    return selectableComponent;
  }

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <>
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiLink
                color={disabled ? 'subdued' : 'primary'}
                onClick={() =>
                  !disabled && (isPopoverOpen ? setIsPopoverOpen(false) : handlePopoverOpen())
                }
                style={disabled ? { cursor: 'default' } : undefined}
              >
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.integrationSelectablePopover.viewIntegrationsLabel',
                  {
                    defaultMessage: 'View Integrations',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isDisabled={disabled}
                onClick={() =>
                  !disabled && (isPopoverOpen ? setIsPopoverOpen(false) : handlePopoverOpen())
                }
                color="text"
                size="xs"
                style={{
                  backgroundColor: euiTheme.colors.backgroundLightText,
                  borderRadius: `${euiTheme.size.xs}`,
                  padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
                }}
              >
                {options.length}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.securitySolution.siemReadiness.integrationSelectablePopover.ariaLabel',
          {
            defaultMessage: 'Select integration to see details',
          }
        )}
        searchable
        singleSelection="always"
        searchProps={{
          placeholder: i18n.translate(
            'xpack.securitySolution.siemReadiness.integrationSelectablePopover.searchPlaceholder',
            {
              defaultMessage: 'Filter list',
            }
          ),
          compressed: true,
        }}
        listProps={{
          showIcons: false,
        }}
        options={options}
        onChange={handleChange}
        renderOption={renderOption}
      >
        {(list, search) => (
          <div style={{ width: '375px' }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
