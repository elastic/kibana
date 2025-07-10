/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Subscription } from 'rxjs';
import { css } from '@emotion/react';
import deepEqual from 'fast-deep-equal';
import { EuiFormRow, EuiSpacer, EuiTextArea, useEuiTheme } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';

import type { FieldHook } from '../../../../shared_imports';
import { FilterBar } from '../../../../common/components/filter_bar';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { EqlOptions } from '../../../../../common/search_strategy';
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_bar_field';
import { useKibana } from '../../../../common/lib/kibana';
import { EQL_ERROR_CODES } from '../../../../common/hooks/eql/api';
import type { EqlQueryBarFooterProps } from './footer';
import { EqlQueryBarFooter } from './footer';
import * as i18n from './translations';

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<FieldValueQueryBar>;
  eqlOptionsField?: FieldHook<EqlOptions>;
  isLoading?: boolean;
  indexPattern: DataViewBase;
  showFilterBar?: boolean;
  idAria?: string;
  isSizeOptionDisabled?: boolean;
  onValidityChange?: (arg: boolean) => void;
  onValidatingChange?: (arg: boolean) => void;
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({
  dataTestSubj,
  field,
  eqlOptionsField,
  isLoading = false,
  indexPattern,
  showFilterBar,
  idAria,
  isSizeOptionDisabled,
  onValidityChange,
  onValidatingChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const { addError } = useAppToasts();
  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));
  const { isValidating, value: fieldValue, setValue: setFieldValue, isValid, errors } = field;
  const errorMessages = useMemo(() => errors.map((x) => x.message), [errors]);

  const textAreaStyles = useMemo(
    () => css`
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      min-height: ${euiTheme.size.xl};
    `,
    [euiTheme.size.xl]
  );

  // Bubbles up field validity to parent.
  // Using something like form `getErrors` does
  // not guarantee latest validity state
  useEffect(() => {
    if (onValidityChange != null) {
      onValidityChange(isValid);
    }
  }, [isValid, onValidityChange]);

  useEffect(() => {
    const requestError = errors.find((x) => x.code === EQL_ERROR_CODES.FAILED_REQUEST);

    if (requestError) {
      addError(requestError.message, { title: i18n.EQL_VALIDATION_REQUEST_ERROR });
    }
  }, [errors, addError]);

  useEffect(() => {
    if (onValidatingChange) {
      onValidatingChange(isValidating);
    }
  }, [isValidating, onValidatingChange]);

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions = new Subscription();
    filterManager.current.setFilters([]);

    subscriptions.add(
      filterManager.current.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.current.getFilters();
            const { filters } = fieldValue;

            if (!deepEqual(filters, newFilters)) {
              setFieldValue({ ...fieldValue, filters: newFilters });
            }
          }
        },
      })
    );

    return () => {
      isSubscribed = false;
      subscriptions.unsubscribe();
    };
  }, [fieldValue, filterManager, setFieldValue]);

  useEffect(() => {
    const { filters } = fieldValue;
    if (!deepEqual(filters, filterManager.current.getFilters())) {
      filterManager.current.setFilters(filters);
    }
  }, [fieldValue, filterManager]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;
      if (onValidatingChange) {
        onValidatingChange(true);
      }
      setFieldValue({
        filters: fieldValue.filters,
        query: {
          query: newQuery,
          language: 'eql',
        },
        saved_id: null,
      });
    },
    [fieldValue, setFieldValue, onValidatingChange]
  );

  const handleEqlOptionsChange = useCallback<
    NonNullable<EqlQueryBarFooterProps['onEqlOptionsChange']>
  >(
    (eqlOptionsFieldName, value) => {
      eqlOptionsField?.setValue((prevEqlOptions) => ({
        ...prevEqlOptions,
        [eqlOptionsFieldName]: value,
      }));
    },
    [eqlOptionsField]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessages[0]}
      isInvalid={!isValid && !isValidating}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        <EuiTextArea
          data-test-subj="eqlQueryBarTextInput"
          css={textAreaStyles}
          fullWidth
          isInvalid={!isValid && !isValidating}
          value={fieldValue.query.query as string}
          onChange={handleChange}
          aria-label={field.label}
        />
        <EqlQueryBarFooter
          errors={errorMessages}
          isLoading={isValidating}
          isSizeOptionDisabled={isSizeOptionDisabled}
          dataView={indexPattern}
          eqlOptions={eqlOptionsField?.value}
          onEqlOptionsChange={handleEqlOptionsChange}
        />
        {showFilterBar && (
          <>
            <EuiSpacer size="xs" />
            <FilterBar
              data-test-subj="eqlFilterBar"
              indexPattern={indexPattern}
              isLoading={isLoading}
              isRefreshPaused={false}
              filterQuery={fieldValue.query}
              filterManager={filterManager.current}
              filters={filterManager.current.getFilters() || []}
              displayStyle="inPage"
            />
          </>
        )}
      </>
    </EuiFormRow>
  );
};
