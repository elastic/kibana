/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, useEuiTheme } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
// import { useHistory } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { LOCAL_STORAGE_NAMESPACE_KEY, DEFAULT_NAMESPACE } from '../common/constants';

interface NamespaceSelectorProps {
  'data-test-subj'?: string;
  postureType?: 'cspm' | 'kspm';
  namespaces: string[];
  onNamespaceChangeCallback: (namespace: string) => void;
}

export const useSelectedNamespace = ({ postureType }: { postureType?: 'cspm' | 'kspm' }) => {
  const [selectedNamespace, setSelectedNamespace] = useLocalStorage(
    `${LOCAL_STORAGE_NAMESPACE_KEY}:${postureType}`,
    DEFAULT_NAMESPACE
  );
  return { selectedNamespace, setSelectedNamespace };
};

export const NamespaceSelector = ({
  'data-test-subj': dataTestSubj,
  postureType,
  namespaces,
  onNamespaceChangeCallback,
}: NamespaceSelectorProps) => {
  const { euiTheme } = useEuiTheme();
  const title = 'Namespace';

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useLocalStorage(
    `${LOCAL_STORAGE_NAMESPACE_KEY}:${postureType}`,
    DEFAULT_NAMESPACE
  );

  const isNamespaceSelected = useCallback(
    (namespaceKey: string) => selectedNamespace === namespaceKey,
    [selectedNamespace]
  );

  const onNamespaceChange = useCallback(
    (namespaceKey: string) => {
      if (namespaceKey !== selectedNamespace) {
        setSelectedNamespace(namespaceKey);
        onNamespaceChangeCallback(namespaceKey);
      }
      setIsPopoverOpen(false);
    },
    [setSelectedNamespace, selectedNamespace]
  );

  const panels = [
    {
      id: 0,
      items: namespaces.map((namespace) => ({
        name: namespace,
        icon: isNamespaceSelected(namespace) ? 'check' : 'empty',
        onClick: () => onNamespaceChange(namespace),
      })),
    },
  ];

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(() => {
    return (
      <EuiButtonEmpty
        data-test-subj="namespace-selector-dropdown-button"
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        title={selectedNamespace}
        size="xs"
      >
        {`${title}: ${selectedNamespace}`}
      </EuiButtonEmpty>
    );
  }, [onButtonClick, selectedNamespace]);

  return (
    <EuiPopover
      data-test-subj={dataTestSubj ?? 'namespaceSelectorPopover'}
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu
        data-test-subj="groupByContextMenu"
        initialPanelId={0}
        panels={panels}
        css={{
          border: euiTheme.border.thin,
        }}
        // border={euiTheme.border}
      />
    </EuiPopover>
  );
};
