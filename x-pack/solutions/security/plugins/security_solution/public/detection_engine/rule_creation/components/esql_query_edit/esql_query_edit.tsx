/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { DataViewBase } from '@kbn/es-query';
import { debounceAsync } from '@kbn/securitysolution-utils';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_bar_field';
import { QueryBarField } from '../../../rule_creation_ui/components/query_bar_field';
import { esqlQueryRequiredValidator } from './validators/esql_query_required_validator';
import { esqlQueryValidatorFactory } from './validators/esql_query_validator_factory';
import { EsqlInfoIcon } from './esql_info_icon';
import * as i18n from './translations';

interface EsqlQueryEditProps {
  path: string;
  fieldsToValidateOnChange?: string | string[];
  dataView: DataViewBase;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onValidityChange?: (arg: boolean) => void;
}

export const EsqlQueryEdit = memo(function EsqlQueryEdit({
  path,
  fieldsToValidateOnChange,
  dataView,
  required = false,
  loading = false,
  disabled = false,
  onValidityChange,
}: EsqlQueryEditProps): JSX.Element {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      // reading .current in cleanup is intentional: we want to abort whichever controller
      // is active at unmount time, not the one that existed when the effect was set up.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      abortControllerRef.current?.abort();
    };
  }, []);

  const componentProps = useMemo(
    () => ({
      isDisabled: disabled,
      isLoading: loading,
      indexPattern: dataView,
      idAria: 'ruleEsqlQueryBar',
      dataTestSubj: 'ruleEsqlQueryBar',
      onValidityChange,
    }),
    [dataView, loading, disabled, onValidityChange]
  );
  const fieldConfig: FieldConfig<FieldValueQueryBar> = useMemo(
    () => ({
      label: i18n.ESQL_QUERY,
      labelAppend: <EsqlInfoIcon />,
      fieldsToValidateOnChange: fieldsToValidateOnChange
        ? [path, fieldsToValidateOnChange].flat()
        : undefined,
      validations: [
        ...(required
          ? [
              {
                validator: esqlQueryRequiredValidator,
              },
            ]
          : []),
        {
          validator: debounceAsync(
            esqlQueryValidatorFactory({ queryClient, abortControllerRef, isUnmountedRef }),
            300
          ),
          isAsync: true,
        },
      ],
    }),
    [required, path, fieldsToValidateOnChange, queryClient]
  );

  return (
    <UseField
      path={path}
      component={QueryBarField}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
});
