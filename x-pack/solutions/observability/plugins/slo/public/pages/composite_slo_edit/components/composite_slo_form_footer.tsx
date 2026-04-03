/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useKibana } from '../../../hooks/use_kibana';
import { useCreateCompositeSlo } from '../hooks/use_create_composite_slo';
import { useUpdateCompositeSlo } from '../hooks/use_update_composite_slo';
import type { CreateCompositeSLOForm } from '../types';

interface Props {
  compositeSloId?: string;
  isEditMode: boolean;
}

export function CompositeSloFormFooter({ compositeSloId, isEditMode }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { getValues, trigger } = useFormContext<CreateCompositeSLOForm>();

  const { mutateAsync: createCompositeSlo, isLoading: isCreating } = useCreateCompositeSlo();
  const { mutateAsync: updateCompositeSlo, isLoading: isUpdating } = useUpdateCompositeSlo();

  const handleSubmit = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const values = getValues();

    if (isEditMode && compositeSloId) {
      await updateCompositeSlo({ compositeSloId, compositeSlo: values });
    } else {
      await createCompositeSlo({ compositeSlo: values });
    }

    navigateToUrl(basePath.prepend(paths.slos));
  };

  const isLoading = isCreating || isUpdating;

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          data-test-subj="compositeSloFormSubmitButton"
          fill
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          {isEditMode
            ? i18n.translate('xpack.slo.compositeSloEdit.updateButton', {
                defaultMessage: 'Update composite SLO',
              })
            : i18n.translate('xpack.slo.compositeSloEdit.createButton', {
                defaultMessage: 'Create composite SLO',
              })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="primary"
          data-test-subj="compositeSloFormCancelButton"
          disabled={isLoading}
          onClick={() => navigateToUrl(basePath.prepend(paths.slos))}
        >
          {i18n.translate('xpack.slo.compositeSloEdit.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
