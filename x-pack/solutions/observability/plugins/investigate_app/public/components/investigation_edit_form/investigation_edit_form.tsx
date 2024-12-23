/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationResponse } from '@kbn/investigation-shared';
import { pick } from 'lodash';
import React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { paths } from '../../../common/paths';
import { useCreateInvestigation } from '../../hooks/use_create_investigation';
import { useFetchInvestigation } from '../../hooks/use_fetch_investigation';
import { useKibana } from '../../hooks/use_kibana';
import { useUpdateInvestigation } from '../../hooks/use_update_investigation';
import { InvestigationNotFound } from '../investigation_not_found/investigation_not_found';
import { ExternalIncidentField } from './fields/external_incident_field';
import { StatusField } from './fields/status_field';
import { TagsField } from './fields/tags_field';
import { toCreateInvestigationParams, toUpdateInvestigationParams } from './form_helper';

export interface InvestigationForm {
  title: string;
  status: InvestigationResponse['status'];
  tags: string[];
  externalIncidentUrl: string | null;
}

interface Props {
  investigationId?: string;
  onClose: () => void;
}

export function InvestigationEditForm({ investigationId, onClose }: Props) {
  const {
    core: {
      http: { basePath },
      application: { navigateToUrl },
    },
  } = useKibana();
  const isEditing = Boolean(investigationId);

  const {
    data: investigation,
    isLoading,
    isError,
  } = useFetchInvestigation({ id: investigationId });

  const { mutateAsync: updateInvestigation } = useUpdateInvestigation();
  const { mutateAsync: createInvestigation } = useCreateInvestigation();

  const methods = useForm<InvestigationForm>({
    defaultValues: {
      title: i18n.translate('xpack.investigateApp.investigationDetailsPage.newInvestigationLabel', {
        defaultMessage: 'New investigation',
      }),
      status: 'triage',
      tags: [],
      externalIncidentUrl: null,
    },
    values: investigation
      ? pick(investigation, ['title', 'status', 'tags', 'externalIncidentUrl'])
      : undefined,
    mode: 'all',
  });

  if (isError) {
    return <InvestigationNotFound />;
  }

  if (isEditing && (isLoading || !investigation)) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const onSubmit = async (data: InvestigationForm) => {
    if (isEditing) {
      await updateInvestigation({
        investigationId: investigationId!,
        payload: toUpdateInvestigationParams(data),
      });
      onClose();
    } else {
      const resp = await createInvestigation(toCreateInvestigationParams(data));
      navigateToUrl(basePath.prepend(paths.investigationDetails(resp.id)));
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <EuiFlyout ownFocus onClose={() => onClose()} size="s">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {isEditing
                  ? i18n.translate('xpack.investigateApp.investigationDetailsPage.h2.editLabel', {
                      defaultMessage: 'Edit',
                    })
                  : i18n.translate('xpack.investigateApp.investigationDetailsPage.h2.createLabel', {
                      defaultMessage: 'Create',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem grow>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.investigateApp.investigationEditForm.span.titleLabel',
                    { defaultMessage: 'Title' }
                  )}
                  isInvalid={methods.getFieldState('title').invalid}
                >
                  <Controller
                    name="title"
                    control={methods.control}
                    rules={{ required: true }}
                    render={({ field: { ref, ...field }, fieldState }) => (
                      <EuiFieldText
                        {...field}
                        fullWidth
                        data-test-subj="titleInput"
                        required
                        isInvalid={fieldState.invalid}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {isEditing && (
                <EuiFlexItem grow>
                  <StatusField />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow>
                <TagsField />
              </EuiFlexItem>
              <EuiFlexItem grow>
                <ExternalIncidentField />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="closeBtn"
                  iconType="cross"
                  onClick={() => onClose()}
                  flush="left"
                >
                  {i18n.translate(
                    'xpack.investigateApp.investigationDetailsPage.closeButtonEmptyLabel',
                    { defaultMessage: 'Close' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton data-test-subj="saveBtn" onClick={methods.handleSubmit(onSubmit)} fill>
                  {i18n.translate('xpack.investigateApp.investigationDetailsPage.saveButtonLabel', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </form>
    </FormProvider>
  );
}
