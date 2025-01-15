/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE, SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { useDeleteSlo } from '../../../hooks/use_delete_slo';
import { useDeleteSloInstance } from '../../../hooks/use_delete_slo_instance';

export interface Props {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SloDeleteModal({ slo, onCancel, onSuccess }: Props) {
  const { name, groupBy } = slo;
  const instanceId =
    'instanceId' in slo && slo.instanceId !== ALL_VALUE ? slo.instanceId : undefined;
  const hasGroupBy = [groupBy].flat().some((group) => group !== ALL_VALUE);

  const modalTitleId = useGeneratedHtmlId();

  const { mutateAsync: deleteSloInstance, isLoading: isDeleteInstanceLoading } =
    useDeleteSloInstance();
  const { mutateAsync: deleteSlo, isLoading: isDeleteLoading } = useDeleteSlo();

  const [isDeleteRollupDataChecked, toggleDeleteRollupDataSwitch] = useState<boolean>(false);
  const onDeleteRollupDataSwitchChange = () =>
    toggleDeleteRollupDataSwitch(!isDeleteRollupDataChecked);

  const handleDeleteInstance = async () => {
    // @ts-ignore
    await deleteSloInstance({ slo, excludeRollup: isDeleteRollupDataChecked === false });
    onSuccess();
  };

  const handleDeleteAll = async () => {
    await deleteSlo({ id: slo.id, name: slo.name });
    onSuccess();
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {hasGroupBy && instanceId ? getInstanceTitleLabel(name, instanceId) : getTitleLabel(name)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {hasGroupBy && instanceId ? (
          <EuiForm component="form">
            <EuiFlexItem grow style={{ marginBottom: '2rem' }}>
              <FormattedMessage
                id="xpack.slo.deleteConfirmationModal.groupByDisclaimerText"
                defaultMessage="This SLO is an instance of many SLO instances."
              />
            </EuiFlexItem>
            <EuiFormRow>
              <EuiSwitch
                name="popswitch"
                label={i18n.translate('xpack.slo.deleteConfirmationModal.switchDeleteRollupData', {
                  defaultMessage: 'Delete rollup data for this instance',
                })}
                checked={isDeleteRollupDataChecked}
                onChange={onDeleteRollupDataSwitchChange}
              />
            </EuiFormRow>
          </EuiForm>
        ) : (
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.descriptionText"
            defaultMessage="You can't recover this SLO after deleting it."
          />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="observabilitySolutionSloDeleteModalCancelButton"
          onClick={onCancel}
          disabled={isDeleteLoading || isDeleteInstanceLoading}
        >
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        {hasGroupBy && instanceId && (
          <EuiButton
            data-test-subj="observabilitySolutionSloDeleteModalConfirmButton"
            type="submit"
            color="danger"
            onClick={handleDeleteInstance}
            disabled={isDeleteLoading || isDeleteInstanceLoading}
            fill
          >
            <FormattedMessage
              id="xpack.slo.deleteConfirmationModal.deleteInstanceButtonLabel"
              defaultMessage="Delete this instance only"
            />
          </EuiButton>
        )}

        <EuiButton
          data-test-subj="observabilitySolutionSloDeleteModalConfirmButton"
          type="submit"
          color="danger"
          onClick={handleDeleteAll}
          disabled={isDeleteLoading || isDeleteInstanceLoading}
          fill
        >
          {hasGroupBy && instanceId ? (
            <FormattedMessage
              id="xpack.slo.deleteConfirmationModal.deleteAllButtonLabel"
              defaultMessage="Delete SLO and all Instances"
            />
          ) : (
            <FormattedMessage
              id="xpack.slo.deleteConfirmationModal.deleteButtonLabel"
              defaultMessage="Delete"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function getTitleLabel(name: string): React.ReactNode {
  return i18n.translate('xpack.slo.deleteConfirmationModal.title', {
    defaultMessage: 'Delete {name}?',
    values: { name },
  });
}

function getInstanceTitleLabel(name: string, instanceId?: string): React.ReactNode {
  return i18n.translate('xpack.slo.deleteConfirmationModal.instanceTitle', {
    defaultMessage: 'Delete {name} [{instanceId}]?',
    values: { name, instanceId },
  });
}
