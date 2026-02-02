/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiPanel, EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AttackDiscoveryPanel } from '../../attack_discovery/pages/results/attack_discovery_panel';
import type { AttackDiscoveryAttachmentData } from '../../../server/agent_builder/attachments/attack_discovery';

interface AttackDiscoveryViewerProps {
  attachment: Attachment<string, AttackDiscoveryAttachmentData>;
}

/**
 * React component for rendering attack_discovery attachments.
 * Wraps the existing AttackDiscoveryPanel component to display
 * MITRE ATT&CK visualization and attack details.
 */
export const AttackDiscoveryViewer: React.FC<AttackDiscoveryViewerProps> = ({ attachment }) => {
  const { attackDiscovery } = attachment.data;
  const [selectedAttackDiscoveries, setSelectedAttackDiscoveries] = useState<
    Record<string, boolean>
  >({});

  const handleSetIsSelected = useCallback(
    ({ id, selected }: { id: string; selected: boolean }) => {
      setSelectedAttackDiscoveries((prev) => ({
        ...prev,
        [id]: selected,
      }));
    },
    []
  );

  if (!attackDiscovery) {
    return (
      <EuiCallOut
        title="Invalid attack discovery data"
        color="danger"
        iconType="error"
        data-test-subj="attackDiscoveryViewer-error"
      >
        <p>The attack discovery data is missing or invalid.</p>
      </EuiCallOut>
    );
  }

  const isSelected = attackDiscovery.id ? selectedAttackDiscoveries[attackDiscovery.id] : false;

  return (
    <EuiPanel paddingSize="none" hasBorder={false} data-test-subj="attackDiscoveryViewer">
      <EuiSpacer size="s" />
      <AttackDiscoveryPanel
        attackDiscovery={attackDiscovery}
        initialIsOpen={true}
        isSelected={isSelected}
        setIsSelected={handleSetIsSelected}
        setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        showAnonymized={false}
      />
    </EuiPanel>
  );
};
