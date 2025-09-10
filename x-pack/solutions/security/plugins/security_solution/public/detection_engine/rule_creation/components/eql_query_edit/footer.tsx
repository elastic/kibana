/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, EuiFieldNumberProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import type { DataViewBase } from '@kbn/es-query';
import type { DebouncedFunc } from 'lodash';
import { debounce, isEmpty } from 'lodash';
import type { EqlOptions } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { ErrorsPopover } from './errors_popover';
import { EqlOverviewLink } from './eql_overview_link';

export interface EqlQueryBarFooterProps {
  errors: string[];
  isLoading?: boolean;
  isSizeOptionDisabled?: boolean;
  dataView: DataViewBase;
  eqlOptions?: EqlOptions;
  onEqlOptionsChange?: <Field extends keyof EqlOptions>(
    field: Field,
    newValue: EqlOptions[Field]
  ) => void;
}

type SizeVoidFunc = (newSize: number) => void;

const singleSelection = { asPlainText: true };

export const EqlQueryBarFooter: FC<EqlQueryBarFooterProps> = ({
  errors,
  isLoading,
  isSizeOptionDisabled,
  dataView,
  eqlOptions,
  onEqlOptionsChange,
}) => {
  const [openEqlSettings, setIsOpenEqlSettings] = useState(false);
  const [localSize, setLocalSize] = useState<number>(eqlOptions?.size ?? 100);
  const debounceSize = useRef<DebouncedFunc<SizeVoidFunc>>();

  const { euiTheme } = useEuiTheme();
  const containerStyles = useMemo(
    () => css`
      border-bottom-left-radius: ${euiTheme.border.radius.small};
      border-bottom-right-radius: ${euiTheme.border.radius.small};
      border: ${euiTheme.border.thin};
      border-top: 0;
      background: ${euiTheme.colors.backgroundBaseFormsPrepend};
    `,
    [euiTheme.border.radius.small, euiTheme.border.thin, euiTheme.colors.backgroundBaseFormsPrepend]
  );
  const groupStyles = useMemo(
    () => css`
      min-height: ${euiTheme.size.xl};
    `,
    [euiTheme.size.xl]
  );
  const groupItemStyles = useMemo(
    () => css`
      :not(:last-child) {
        margin-right: ${euiTheme.size.s};
      }
      :last-child {
        border-left: ${euiTheme.border.thin};
      }
    `,
    [euiTheme.border.thin, euiTheme.size.s]
  );
  const spinnerStyles = useMemo(
    () => css`
      margin-left: ${euiTheme.size.s};
    `,
    [euiTheme.size.s]
  );

  const { keywordFields, nonDateFields, dateFields } = useMemo(
    () =>
      isEmpty(dataView?.fields)
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: dataView.fields
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: dataView.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: dataView.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [dataView]
  );

  const openEqlSettingsHandler = useCallback(() => {
    setIsOpenEqlSettings(true);
  }, []);
  const closeEqlSettingsHandler = useCallback(() => {
    setIsOpenEqlSettings(false);
  }, []);

  const handleEventCategoryField = useCallback(
    (opt: EuiComboBoxOptionOption[]) => {
      if (onEqlOptionsChange) {
        if (opt.length > 0) {
          onEqlOptionsChange('eventCategoryField', opt[0].label);
        } else {
          onEqlOptionsChange('eventCategoryField', undefined);
        }
      }
    },
    [onEqlOptionsChange]
  );
  const handleTiebreakerField = useCallback(
    (opt: EuiComboBoxOptionOption[]) => {
      if (onEqlOptionsChange) {
        if (opt.length > 0) {
          onEqlOptionsChange('tiebreakerField', opt[0].label);
        } else {
          onEqlOptionsChange('tiebreakerField', undefined);
        }
      }
    },
    [onEqlOptionsChange]
  );
  const handleTimestampField = useCallback(
    (opt: EuiComboBoxOptionOption[]) => {
      if (onEqlOptionsChange) {
        if (opt.length > 0) {
          onEqlOptionsChange('timestampField', opt[0].label);
        } else {
          onEqlOptionsChange('timestampField', undefined);
        }
      }
    },
    [onEqlOptionsChange]
  );
  const handleSizeField = useCallback<NonNullable<EuiFieldNumberProps['onChange']>>(
    (evt) => {
      if (onEqlOptionsChange) {
        setLocalSize(evt?.target?.valueAsNumber);
        if (debounceSize.current?.cancel) {
          debounceSize.current?.cancel();
        }
        debounceSize.current = debounce((newSize) => onEqlOptionsChange('size', newSize), 800);
        debounceSize.current(evt?.target?.valueAsNumber);
      }
    },
    [onEqlOptionsChange]
  );

  const eventCategoryField = useMemo(
    () =>
      eqlOptions?.eventCategoryField != null
        ? [{ label: eqlOptions?.eventCategoryField }]
        : undefined,
    [eqlOptions?.eventCategoryField]
  );
  const tiebreakerField = useMemo(
    () =>
      eqlOptions?.tiebreakerField != null ? [{ label: eqlOptions?.tiebreakerField }] : undefined,
    [eqlOptions?.tiebreakerField]
  );
  const timestampField = useMemo(
    () =>
      eqlOptions?.timestampField != null ? [{ label: eqlOptions?.timestampField }] : undefined,
    [eqlOptions?.timestampField]
  );

  return (
    <EuiFlexGroup className={containerStyles}>
      <EuiFlexGroup
        alignItems="center"
        className={groupStyles}
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              {errors.length > 0 && (
                <ErrorsPopover
                  ariaLabel={i18n.EQL_VALIDATION_ERROR_POPOVER_LABEL}
                  errors={errors}
                />
              )}
              {isLoading && (
                <EuiLoadingSpinner
                  className={spinnerStyles}
                  data-test-subj="eql-validation-loading"
                  size="m"
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize={'none'} alignItems="center" responsive={false}>
            {!onEqlOptionsChange && (
              <EuiFlexItem grow={false}>
                <EqlOverviewLink />
              </EuiFlexItem>
            )}

            {onEqlOptionsChange && (
              <>
                <EuiFlexItem className={groupItemStyles} grow={false}>
                  <EqlOverviewLink />
                </EuiFlexItem>
                <EuiFlexItem className={groupItemStyles} grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        onClick={openEqlSettingsHandler}
                        iconType="controlsVertical"
                        isDisabled={openEqlSettings}
                        aria-label="eql settings"
                        data-test-subj="eql-settings-trigger"
                      />
                    }
                    isOpen={openEqlSettings}
                    closePopover={closeEqlSettingsHandler}
                    anchorPosition="downCenter"
                    ownFocus={false}
                  >
                    <EuiPopoverTitle>{i18n.EQL_SETTINGS_TITLE}</EuiPopoverTitle>
                    <div css={{ width: '300px' }}>
                      {!isSizeOptionDisabled && (
                        <EuiFormRow
                          data-test-subj="eql-size-field"
                          label={i18n.EQL_OPTIONS_SIZE_LABEL}
                          helpText={i18n.EQL_OPTIONS_SIZE_HELPER}
                        >
                          <EuiFieldNumber
                            value={localSize}
                            onChange={handleSizeField}
                            min={1}
                            max={10000}
                          />
                        </EuiFormRow>
                      )}
                      <EuiFormRow
                        data-test-subj="eql-event-category-field"
                        label={i18n.EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_CATEGORY_FIELD_HELPER}
                      >
                        <EuiComboBox
                          options={keywordFields}
                          selectedOptions={eventCategoryField}
                          singleSelection={singleSelection}
                          onChange={handleEventCategoryField}
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        data-test-subj="eql-tiebreaker-field"
                        label={i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_HELPER}
                      >
                        <EuiComboBox
                          options={nonDateFields}
                          selectedOptions={tiebreakerField}
                          singleSelection={singleSelection}
                          onChange={handleTiebreakerField}
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        data-test-subj="eql-timestamp-field"
                        label={i18n.EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL}
                        helpText={i18n.EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_HELPER}
                      >
                        <EuiComboBox
                          options={dateFields}
                          selectedOptions={timestampField}
                          singleSelection={singleSelection}
                          onChange={handleTimestampField}
                        />
                      </EuiFormRow>
                    </div>
                  </EuiPopover>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
