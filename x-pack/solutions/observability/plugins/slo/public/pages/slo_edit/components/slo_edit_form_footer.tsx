/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GetSLOResponse } from '@kbn/slo-schema';
import React, { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { InPortal } from 'react-reverse-portal';
import { useCreateRule } from '../../../hooks/use_create_burn_rate_rule';
import { useKibana } from '../../../hooks/use_kibana';
import { sloEditFormFooterPortal } from '../shared_flyout/slo_add_form_flyout';
import { paths } from '../../../../common/locators/paths';
import { useCreateSlo } from '../../../hooks/use_create_slo';
import { useUpdateSlo } from '../../../hooks/use_update_slo';
import { BurnRateRuleParams } from '../../../typings';
import { createBurnRateRuleRequestBody } from '../helpers/create_burn_rate_rule_request_body';
import {
  transformCreateSLOFormToCreateSLOInput,
  transformValuesToUpdateSLOInput,
} from '../helpers/process_slo_form_values';
import { CreateSLOForm } from '../types';
import { EquivalentApiRequest } from './common/equivalent_api_request';
import { SLOInspect } from './common/slo_inspect/slo_inspect';

export interface Props {
  slo?: GetSLOResponse;
  onSave?: () => void;
}

export function SloEditFormFooter({ slo, onSave }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const isEditMode = slo !== undefined;

  const { getValues, trigger } = useFormContext<CreateSLOForm>();

  const { mutateAsync: createSlo, isLoading: isCreateSloLoading } = useCreateSlo();
  const { mutateAsync: updateSlo, isLoading: isUpdateSloLoading } = useUpdateSlo();
  const { mutate: createBurnRateRule, isLoading: isCreateBurnRateRuleLoading } =
    useCreateRule<BurnRateRuleParams>();

  const navigate = useCallback(
    (url: string) => setTimeout(() => navigateToUrl(url)),
    [navigateToUrl]
  );

  const isFlyout = Boolean(onSave);

  const handleSubmit = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    const values = getValues();

    if (isEditMode) {
      const processedValues = transformValuesToUpdateSLOInput(values);
      await updateSlo({ sloId: slo.id, slo: processedValues });
      navigate(basePath.prepend(paths.slos));
    } else {
      const processedValues = transformCreateSLOFormToCreateSLOInput(values);
      const resp = await createSlo({ slo: processedValues });
      createBurnRateRule({
        rule: createBurnRateRuleRequestBody({ ...processedValues, id: resp.id }),
      });
      if (onSave) {
        onSave();
      } else {
        navigate(basePath.prepend(paths.slos));
      }
    }
  }, [
    basePath,
    createBurnRateRule,
    createSlo,
    getValues,
    isEditMode,
    navigate,
    onSave,
    slo?.id,
    trigger,
    updateSlo,
  ]);

  const content = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            data-test-subj="sloFormSubmitButton"
            fill
            isLoading={isCreateSloLoading || isUpdateSloLoading || isCreateBurnRateRuleLoading}
            onClick={handleSubmit}
          >
            {isEditMode
              ? i18n.translate('xpack.slo.sloEdit.editSloButton', {
                  defaultMessage: 'Update SLO',
                })
              : i18n.translate('xpack.slo.sloEdit.createSloButton', {
                  defaultMessage: 'Create SLO',
                })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="primary"
            data-test-subj="sloFormCancelButton"
            disabled={isCreateSloLoading || isUpdateSloLoading || isCreateBurnRateRuleLoading}
            onClick={onSave ? () => onSave() : () => navigateToUrl(basePath.prepend(paths.slos))}
          >
            {i18n.translate('xpack.slo.sloEdit.cancelButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>

        {!isFlyout && (
          <>
            <EuiFlexItem grow={false}>
              <EquivalentApiRequest
                slo={slo}
                disabled={isCreateSloLoading || isUpdateSloLoading || isCreateBurnRateRuleLoading}
                isEditMode={isEditMode}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SLOInspect
                slo={slo}
                disabled={isCreateSloLoading || isUpdateSloLoading || isCreateBurnRateRuleLoading}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    ),
    [
      isCreateSloLoading,
      isUpdateSloLoading,
      isCreateBurnRateRuleLoading,
      handleSubmit,
      isEditMode,
      onSave,
      isFlyout,
      slo,
      navigateToUrl,
      basePath,
    ]
  );

  return isFlyout ? <InPortal node={sloEditFormFooterPortal}>{content}</InPortal> : content;
}
