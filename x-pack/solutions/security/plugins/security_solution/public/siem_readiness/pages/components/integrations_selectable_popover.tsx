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

export const IntegrationSelectablePopover = (
  props: Pick<EuiSelectableProps, 'options' | 'onChange'>
) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { options, onChange } = props;
  const { euiTheme } = useEuiTheme();

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
        onChange={(newOptions, event, changedOption) => {
          onChange?.(newOptions, event, changedOption);
        }}
      >
        {(list, search) => (
          <div style={{ width: `calc(${euiTheme.base} * 15)` }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
