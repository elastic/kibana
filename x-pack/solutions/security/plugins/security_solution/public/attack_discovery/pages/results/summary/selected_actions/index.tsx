/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';

import { Separator } from '../separator';
import { TakeAction } from '../../take_action';
import * as i18n from './translations';

interface Props {
  refetchFindAttackDiscoveries?: () => void;
  selectedAttackDiscoveries: Record<string, boolean>;
  selectedConnectorAttackDiscoveries: AttackDiscoveryAlert[];
  setSelectedAttackDiscoveries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const SelectedActionsComponent: React.FC<Props> = ({
  refetchFindAttackDiscoveries,
  selectedAttackDiscoveries,
  selectedConnectorAttackDiscoveries,
  setSelectedAttackDiscoveries,
}) => {
  const selectedCount = useMemo(
    () => Object.values(selectedAttackDiscoveries).filter(Boolean).length,
    [selectedAttackDiscoveries]
  );

  const selected = useMemo(() => {
    const selectedIds = Object.keys(selectedAttackDiscoveries).filter(
      (id) => selectedAttackDiscoveries[id]
    );

    return selectedConnectorAttackDiscoveries.filter((discovery) =>
      selectedIds.includes(discovery.id)
    );
  }, [selectedAttackDiscoveries, selectedConnectorAttackDiscoveries]);

  const buttonText = useMemo(() => i18n.SELECTED_DISCOVERIES(selectedCount), [selectedCount]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="summary"
      gutterSize="none"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        <Separator marginRight="0px" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <TakeAction
          attackDiscoveries={selected}
          buttonSize="xs"
          buttonText={buttonText}
          refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
          setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SelectedActions = React.memo(SelectedActionsComponent);
