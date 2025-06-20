/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface NamespaceSelectorProps {
  'data-test-subj'?: string;
  postureType?: 'cspm' | 'kspm';
  activeNamespace: string;
  namespaces: string[];
  onNamespaceChange: (namespace: string) => void;
}

export const NamespaceSelector = ({
  activeNamespace,
  namespaces,
  onNamespaceChange,

  postureType,
  'data-test-subj': dataTestSubj,
}: NamespaceSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onSelectedNamespaceChange = useCallback(
    (namespaceKey: string) => {
      if (namespaceKey !== activeNamespace) {
        onNamespaceChange(namespaceKey);
      }
      setIsPopoverOpen(false);
    },
    [activeNamespace, onNamespaceChange]
  );

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const isSelectedProps = useCallback(
    (namespace: string) => {
      return namespace === activeNamespace
        ? { icon: 'check', 'aria-current': true }
        : { icon: 'empty', 'aria-current': undefined };
    },
    [activeNamespace]
  );

  const menuItems = useMemo(() => {
    return namespaces.map((namespace, index) => (
      <React.Fragment key={`namespace-selector-${namespace}`}>
        <EuiContextMenuItem
          {...isSelectedProps(namespace)}
          key={namespace}
          onClick={() => {
            onSelectedNamespaceChange(namespace);
          }}
        >
          {namespace}
        </EuiContextMenuItem>
        {index < namespaces.length - 1 && (
          <EuiHorizontalRule margin="none" key={`rule-${namespace}`} />
        )}
      </React.Fragment>
    ));
  }, [namespaces, isSelectedProps, onSelectedNamespaceChange]);

  const button = useMemo(() => {
    const title = i18n.translate('xpack.csp.namespaceSelector.title', {
      defaultMessage: 'Namespace',
    });
    return (
      <EuiButtonEmpty
        data-test-subj="namespace-selector-dropdown-button"
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        title={activeNamespace}
        size="xs"
      >
        {`${title}: ${activeNamespace}`}
      </EuiButtonEmpty>
    );
  }, [onButtonClick, activeNamespace]);

  return (
    <EuiPopover
      data-test-subj={dataTestSubj ?? 'namespaceSelectorPopover'}
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={menuItems} className="cspNamespaceSelectorPanel" />
    </EuiPopover>
  );
};
