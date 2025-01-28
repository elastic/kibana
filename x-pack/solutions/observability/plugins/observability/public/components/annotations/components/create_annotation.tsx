/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { Moment } from 'moment';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
import { AnnotationForm } from '../annotation_form';

export type CreateAnnotationForm = Omit<CreateAnnotationParams, '@timestamp' | 'event'> & {
  '@timestamp': Moment;
  event: {
    start?: Moment | null;
    end?: Moment | null;
  };
};

export interface CreateAnnotationProps {
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
  isCreateAnnotationsOpen: boolean;
  editAnnotation?: Annotation | null;
  updateAnnotation: (data: { annotation: Annotation }) => void;
  createAnnotation: (data: { annotation: CreateAnnotationParams }) => void;
  deleteAnnotation: (data: { annotations: Annotation[] }) => void;
}

export function CreateAnnotation({
  onSave,
  onCancel,
  isLoading,
  editAnnotation,
  createAnnotation,
  deleteAnnotation,
  updateAnnotation,
  isCreateAnnotationsOpen,
}: CreateAnnotationProps) {
  const { trigger, getValues } = useFormContext<CreateAnnotationForm>();

  const onSubmit = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid) return;
    const values = getValues();
    const timestamp = values['@timestamp'].toISOString();
    if (editAnnotation?.id) {
      await updateAnnotation({
        annotation: {
          ...values,
          id: editAnnotation.id,
          '@timestamp': timestamp,
          event: {
            start: timestamp,
            end: values.event?.end?.toISOString(),
          },
        },
      });
    } else {
      await createAnnotation({
        annotation: {
          ...values,
          '@timestamp': timestamp,
          event: {
            start: timestamp,
            end: values.event?.end?.toISOString(),
          },
        },
      });
    }
    onSave();
  }, [trigger, getValues, editAnnotation?.id, onSave, updateAnnotation, createAnnotation]);

  const onDelete = async () => {
    if (editAnnotation?.id) {
      await deleteAnnotation({ annotations: [editAnnotation] });
      onSave();
    }
  };

  let flyout;
  if (isCreateAnnotationsOpen) {
    flyout = (
      <EuiFlyoutResizable onClose={onCancel} type="push" size="s" maxWidth={700}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2>
              {editAnnotation
                ? i18n.translate(
                    'xpack.observability.createAnnotation.editAnnotationModalHeaderTitleLabel',
                    {
                      defaultMessage: 'Update annotation',
                    }
                  )
                : i18n.translate(
                    'xpack.observability.createAnnotation.addAnnotationModalHeaderTitleLabel',
                    { defaultMessage: 'Create annotation' }
                  )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AnnotationForm editAnnotation={editAnnotation} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilitySolutionCancelButton"
                onClick={onCancel}
                isLoading={isLoading}
              >
                {i18n.translate('xpack.observability.createAnnotation.closeButtonEmptyLabel', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem />
            {editAnnotation?.id && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="annotationDeleteButton"
                  type="submit"
                  onClick={() => onDelete()}
                  isLoading={isLoading}
                  color="danger"
                >
                  {i18n.translate('xpack.observability.createAnnotation.deleteButtonLabel', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="annotationSaveButton"
                type="submit"
                onClick={() => onSubmit()}
                isLoading={isLoading}
                fill
              >
                {editAnnotation?.id
                  ? i18n.translate('xpack.observability.createAnnotation.updateButtonLabel', {
                      defaultMessage: 'Update',
                    })
                  : i18n.translate('xpack.observability.createAnnotation.saveButtonLabel', {
                      defaultMessage: 'Save',
                    })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
  return <>{flyout}</>;
}

// eslint-disable-next-line import/no-default-export
export default CreateAnnotation;
