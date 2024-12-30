/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useState } from 'react';
import { InferenceServiceFormFields } from '@kbn/inference-endpoint-ui-common';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useProviders } from '../../hooks/use_providers';
import * as i18n from './translations';
import { useAddEndpoint } from '../../hooks/use_add_endpoint';
import { InferenceEndpoint } from '../../types';

interface InferenceFormProps {
  onSubmitSuccess: (state: boolean) => void;
}
export const InferenceForm: React.FC<InferenceFormProps> = ({ onSubmitSuccess }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccess = useCallback(() => {
    setIsLoading(false);
    onSubmitSuccess(false);
  }, [onSubmitSuccess]);
  const onError = useCallback(() => {
    setIsLoading(false);
  }, []);
  const { mutate: addEndpoint } = useAddEndpoint(
    () => onSuccess(),
    () => onError()
  );
  const { data: providers } = useProviders();
  const { form } = useForm();
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    const { isValid, data } = await form.submit();

    if (isValid) {
      addEndpoint({
        inferenceEndpoint: data as InferenceEndpoint,
      });
    } else {
      setIsLoading(false);
    }
  }, [addEndpoint, form]);

  return providers ? (
    <Form form={form}>
      <InferenceServiceFormFields providers={providers} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="success"
            size="m"
            isLoading={form.isSubmitting || isLoading}
            disabled={(!form.isValid && form.isSubmitted) || isLoading}
            data-test-subj="add-inference-endpoint-submit-button"
            onClick={handleSubmit}
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  ) : null;
};
