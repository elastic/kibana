/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSuperSelect, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface NamespaceSelectorProps {
  activeNamespace: string;
  namespaces: string[];
  onNamespaceChange: (namespace: string) => void;
}

export const NamespaceSelector = ({
  activeNamespace,
  namespaces,
  onNamespaceChange,
}: NamespaceSelectorProps) => {
  const onSelectedNamespaceChange = useCallback(
    (newNamespace: string) => {
      onNamespaceChange(newNamespace);
    },
    [onNamespaceChange]
  );

  const namespaceOptions = useMemo(() => {
    return namespaces.map((namespace) => ({
      value: namespace,
      inputDisplay: <>{namespace}</>,

      dropdownDisplay: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s">{namespace}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': `namespace-selector-menu-item-${namespace}`,
    }));
  }, [namespaces]);

  const label = i18n.translate('xpack.csp.namespaceSelector.title', {
    defaultMessage: 'Namespace',
  });

  return (
    <div style={{ width: '250px' }}>
      <EuiSuperSelect
        data-test-subj="namespace-selector-dropdown-button"
        options={namespaceOptions}
        valueOfSelected={activeNamespace}
        onChange={onSelectedNamespaceChange}
        disabled={namespaces.length < 2}
        hasDividers
        fullWidth
        compressed
        aria-label={label}
        prepend={<span>{label}</span>}
      />
    </div>
  );
};
