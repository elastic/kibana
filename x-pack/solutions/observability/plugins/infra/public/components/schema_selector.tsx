/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HostsState } from '../pages/metrics/hosts/hooks/use_unified_search_url_state';

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
export const SchemaSelector = ({
  onChange,
  options,
  value,
}: {
  onChange: (selected: HostsState['preferredSchema']) => void;
  options: Array<{ text: string; value: string }>;
  value: string;
}) => {
  console.log('SchemaSelector value:', value);
  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue) {
      console.log('SchemaSelector onSelect:', selectedValue);
      onChange(selectedValue as HostsState['preferredSchema']);
    }
  };

  if (options.length <= 1) return null;

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
                value={value}
                onChange={onSelect}
                aria-label={i18n.translate('xpack.infra.schemaSelector.ariaLabel', {
                  defaultMessage: 'Select schema for data collection',
                })}
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
