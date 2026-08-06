/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';

interface KillDescendantsFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const LABEL = i18n.translate(
  'xpack.securitySolution.responseActions.endpoint.killDescendantsFieldLabel',
  {
    defaultMessage: 'Kill descendant processes',
  }
);

const KillDescendantsFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: KillDescendantsFieldProps) => {
  const CONFIG = useMemo(() => {
    return {
      defaultValue: false,
      label: LABEL,
    };
  }, []);

  return (
    <UseField
      component={ToggleField}
      euiFieldProps={{
        'data-test-subj': 'config-kill-descendants-toggle',
      }}
      path={path}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={CONFIG}
      isDisabled={disabled}
    />
  );
};

export const KillDescendantsField = React.memo(KillDescendantsFieldComponent);
