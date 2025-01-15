/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { SloDeleteModal } from '../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloResetConfirmationModal } from '../../components/slo/reset_confirmation_modal/slo_reset_confirmation_modal';
import { useResetSlo } from '../../hooks/use_reset_slo';
import { SloIndicatorTypeBadge } from '../slos/components/badges/slo_indicator_type_badge';
import { SloTimeWindowBadge } from '../slos/components/badges/slo_time_window_badge';

interface OutdatedSloProps {
  slo: SLODefinitionResponse;
  onReset: () => void;
  onDelete: () => void;
}

export function OutdatedSlo({ slo, onReset, onDelete }: OutdatedSloProps) {
  const { mutateAsync: resetSlo, isLoading: isResetLoading } = useResetSlo();
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isResetConfirmationModalOpen, setResetConfirmationModalOpen] = useState(false);

  const handleDelete = () => {
    setDeleteConfirmationModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteConfirmationModalOpen(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };

  const handleReset = () => {
    setResetConfirmationModalOpen(true);
  };

  const handleResetConfirm = async () => {
    setResetConfirmationModalOpen(false);
    await resetSlo({ id: slo.id, name: slo.name });
    onReset();
  };

  const handleResetCancel = () => {
    setResetConfirmationModalOpen(false);
  };

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText>
                <span>{slo.name}</span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              responsive={false}
              gutterSize="s"
              alignItems="center"
              wrap
            >
              <SloIndicatorTypeBadge slo={slo} />
              <SloTimeWindowBadge slo={slo} />
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiButton
            data-test-subj="o11ySlosOutdatedDefinitionsResetButton"
            color="primary"
            fill
            isLoading={isResetLoading}
            onClick={handleReset}
          >
            <FormattedMessage
              id="xpack.slo.slosOutdatedDefinitions.resetButtonLabel"
              defaultMessage="Reset"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiButton
            data-test-subj="o11ySlosOutdatedDefinitionsDeleteButton"
            color="danger"
            fill
            onClick={handleDelete}
          >
            <FormattedMessage
              id="xpack.slo.slosOutdatedDefinitions.deleteButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isDeleteConfirmationModalOpen ? (
        <SloDeleteModal slo={slo} onCancel={handleDeleteCancel} onSuccess={handleDeleteConfirm} />
      ) : null}
      {isResetConfirmationModalOpen ? (
        <SloResetConfirmationModal
          slo={slo}
          onCancel={handleResetCancel}
          onConfirm={handleResetConfirm}
        />
      ) : null}
    </EuiPanel>
  );
}
