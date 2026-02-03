/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableProps } from '@elastic/eui';
import {
  useEuiTheme,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiSelectable,
  EuiPopoverTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useBasePath } from '../../../common/lib/kibana';

interface IntegrationSelectablePopoverProps extends Pick<EuiSelectableProps, 'options'> {
  showOnlySelectable?: boolean;
}

export const IntegrationSelectablePopover = (props: IntegrationSelectablePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { options, showOnlySelectable } = props;
  const { euiTheme } = useEuiTheme();
  const basePath = useBasePath();

  const handleChange: EuiSelectableProps['onChange'] = (newOptions) => {
    // Find the selected option
    const selectedOption = newOptions.find((option) => option.checked === 'on');

    if (selectedOption?.key) {
      // Navigate to the integration detail page
      const integrationUrl = `${basePath}/app/integrations/detail/${selectedOption.key}`;
      window.open(integrationUrl, '_blank', 'noopener,noreferrer');
      setIsPopoverOpen(false);
    }
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
      options={options}
      onChange={handleChange}
    >
      {(list, search) => (
        <div style={{ width: '240px' }}>
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
              <EuiLink onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
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
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
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
        options={options}
        onChange={handleChange}
      >
        {(list, search) => (
          <div style={{ width: '240px' }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
