/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren, useMemo } from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { FormMonitorType, SyntheticsMonitor } from '../types';
import { getDefaultFormFields, formatDefaultFormValues } from './defaults';
import { ActionBar } from './submit';
import { Disclaimer } from './disclaimer';
import { ClientPluginsStart } from '../../../../../plugin';
const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const MonitorForm: FC<
  PropsWithChildren<{
    defaultValues?: SyntheticsMonitor;
    space?: string;
    readOnly?: boolean;
    canUsePublicLocations?: boolean;
  }>
> = ({ children, defaultValues, space, readOnly = false, canUsePublicLocations }) => {
  const methods = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues:
      formatDefaultFormValues(defaultValues as SyntheticsMonitor) ||
      getDefaultFormFields(space)[FormMonitorType.MULTISTEP],
    shouldFocusError: false,
  });

  const { spaces: spacesApi } = useKibana<ClientPluginsStart>().services;

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  /* React hook form doesn't seem to register a field
   * as dirty until validation unless dirtyFields is subscribed to */
  const {
    formState: { isSubmitted, errors, dirtyFields: _ },
  } = methods;

  return (
    <ContextWrapper>
      <FormProvider {...methods}>
        <EuiForm
          isInvalid={Boolean(isSubmitted && Object.keys(errors).length)}
          component="form"
          noValidate
        >
          {children}
          <EuiSpacer />
          <ActionBar readOnly={readOnly} canUsePublicLocations={canUsePublicLocations} />
        </EuiForm>
        <Disclaimer />
      </FormProvider>
    </ContextWrapper>
  );
};
