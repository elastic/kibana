/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import {
  EXCEPTION_APPLIES_TO,
  isEsqlOutputColumnsItem,
} from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { ExceptionAppliesTo } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type {
  CreateRuleExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  OsType,
  OsTypeArray,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  DataViewField,
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';
import type { DataViewBase } from '@kbn/es-query';
import styled from '@emotion/styled';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { hasEqlSequenceQuery } from '../../../../../../common/detection_engine/utils';
import type { Rule } from '../../../../rule_management/logic/types';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';
import * as sharedI18n from '../../../utils/translations';
import { ShowValueListModal } from '../../../../../value_list/components/show_value_list_modal';

const OS_OPTIONS: Array<EuiComboBoxOptionOption<OsTypeArray>> = [
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS,
    value: ['windows'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_MAC,
    value: ['macos'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_LINUX,
    value: ['linux'],
  },
  {
    label: sharedI18n.OPERATING_SYSTEM_WINDOWS_AND_MAC,
    value: ['windows', 'macos'],
  },
];

const SectionHeader = styled(EuiTitle)`
  font-weight: ${({ theme }) => theme.euiTheme.font.weight.semiBold};
`;

interface ExceptionsFlyoutConditionsComponentProps {
  /* What the item applies to. An item that does not say applies to the source documents. */
  appliesTo?: ExceptionAppliesTo;
  /* Offers the choice of what the item applies to, which is made when adding an item, except for Endpoint exceptions */
  onAppliesToChange?: (appliesTo: ExceptionAppliesTo) => void;
  /* Exception list item field value for "name" */
  exceptionItemName: string;
  /* Not all rule types support large value lists */
  allowLargeValueLists: boolean;
  /* Exception items - could be one being edited, or multiple being added */
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  /* Fields used to populate the field option dropdown */
  indexPatterns: DataViewBase;
  /* Exception items can be added to zero (just being added to a shared list), one or more rules */
  rules: Rule[] | null;
  /* OS options required for endpoint exceptions */
  showOsTypeOptions: boolean;
  /* Selected OS option required for endpoint exceptions */
  selectedOs: OsTypeArray | undefined;
  /* Determines whether component is being used in an add or edit functionality */
  isEdit: boolean;
  /*
   * Supported exception list types are 'endpoint', 'detection' and 'rule_default' */
  exceptionListType: ExceptionListType;
  /* OS selection handler */
  onOsChange?: (os: OsTypeArray | undefined) => void;
  /* Exception item builder takes a callback used when there are updates to the item */

  onExceptionItemAdd: (items: ExceptionsBuilderReturnExceptionItem[]) => void;
  /* Exception item builder takes a callback used when there are updates to the item that includes information on if any form errors exist */
  onSetErrorExists: (errorExists: boolean) => void;

  getExtendedFields?: (fields: string[]) => Promise<DataViewField[]>;
}

const ExceptionsConditionsComponent: React.FC<ExceptionsFlyoutConditionsComponentProps> = ({
  appliesTo = EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS,
  onAppliesToChange,
  exceptionItemName,
  allowLargeValueLists,
  exceptionListItems,
  indexPatterns,
  rules,
  exceptionListType,
  showOsTypeOptions,
  selectedOs,
  isEdit,
  onOsChange,
  onExceptionItemAdd,
  onSetErrorExists,
  getExtendedFields,
}): JSX.Element => {
  const { http, kql } = useKibana().services;
  const isEndpointException = useMemo(
    (): boolean => exceptionListType === ExceptionListTypeEnum.ENDPOINT,
    [exceptionListType]
  );
  const includesRuleWithEQLSequenceStatement = useMemo((): boolean => {
    return (
      rules != null && rules.some((rule) => rule.type === 'eql' && hasEqlSequenceQuery(rule.query))
    );
  }, [rules]);

  // If editing an item (can only edit a single item at a time), get it's
  // list_id. Otherwise, if it is an item for an endpoint list, the list_id is
  // hard coded. For all others, we'll fill in the appropriate list_id when
  // enriching items before creating when we know if they'll be added to the rule_default
  // list or a shared list.
  const listIdToUse = useMemo((): string | undefined => {
    if (isEndpointException) {
      return 'endpoint_list';
    }

    const defaultValue = isEndpointException
      ? ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
      : undefined;

    return isEdit ? exceptionListItems[0].list_id : defaultValue;
  }, [isEndpointException, isEdit, exceptionListItems]);

  // If editing an item (can only edit a single item at a time), get it's
  // namespace_type. Otherwise, if it is an item for an endpoint list, the namespace_type is
  // 'agnostic'. For all others, we'll fill in the appropriate list_id when
  // enriching items before creating when we know if they'll be added to the rule_default
  // list or a shared list.
  const listNamespaceType = useMemo((): NamespaceType | undefined => {
    const defaultValue = isEndpointException ? 'agnostic' : undefined;

    return isEdit ? exceptionListItems[0].namespace_type : defaultValue;
  }, [exceptionListItems, isEdit, isEndpointException]);

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
      errorExists,
    }: {
      exceptionItems: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema | CreateRuleExceptionListItemSchema
      >;
      errorExists: boolean;
    }) => {
      onExceptionItemAdd(exceptionItems);
      onSetErrorExists(errorExists);
    },
    [onSetErrorExists, onExceptionItemAdd]
  );

  const handleOSSelectionChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<OsTypeArray>>): void => {
      const os = selectedOptions[0].value;
      if (onOsChange != null) {
        onOsChange(os ? os : undefined);
      }
    },
    [onOsChange]
  );

  const osSingleSelectionOptions = useMemo(() => {
    return { asPlainText: true };
  }, []);

  const selectedOStoOptions = useMemo((): Array<EuiComboBoxOptionOption<OsTypeArray>> => {
    return OS_OPTIONS.filter((option) => {
      return selectedOs === option.value;
    });
  }, [selectedOs]);

  const isExceptionBuilderFormDisabled = useMemo(() => {
    return showOsTypeOptions && selectedOs === undefined;
  }, [showOsTypeOptions, selectedOs]);

  const osDisplay = (osTypes: OsTypeArray): string => {
    const translateOS = (currentOs: OsType): string => {
      return currentOs === 'linux'
        ? sharedI18n.OPERATING_SYSTEM_LINUX
        : currentOs === 'macos'
        ? sharedI18n.OPERATING_SYSTEM_MAC
        : sharedI18n.OPERATING_SYSTEM_WINDOWS;
    };
    return osTypes
      .reduce((osString, currentOs) => {
        return `${translateOS(currentOs)}, ${osString}`;
      }, '')
      .slice(0, -2);
  };

  const eqlCalloutWarning = useMemo((): string => {
    return isEdit ? i18n.EDIT_EXCEPTION_SEQUENCE_WARNING : i18n.ADD_EXCEPTION_SEQUENCE_WARNING;
  }, [isEdit]);

  const isEsqlOutputColumns = isEsqlOutputColumnsItem({ applies_to: appliesTo });
  // Only known when the rules are, and an item that is added to a shared list has none
  const hasNoEsqlRule =
    rules != null && rules.length > 0 && rules.every(({ type }) => type !== 'esql');
  const appliesToOptions = useMemo(
    () => [
      {
        id: EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS,
        label: i18n.APPLIES_TO_SOURCE_DOCUMENTS,
        'data-test-subj': 'exceptionAppliesToSourceDocuments',
      },
      {
        id: EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS,
        label: i18n.APPLIES_TO_COMPUTED_COLUMNS,
        'data-test-subj': 'exceptionAppliesToComputedColumns',
      },
    ],
    []
  );
  const handleAppliesToChange = useCallback(
    (id: string): void => {
      onAppliesToChange?.(
        id === EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS
          ? EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS
          : EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS
      );
    },
    [onAppliesToChange]
  );

  const osTypes = useMemo((): OsTypeArray => {
    return (isEdit ? exceptionListItems[0].os_types : selectedOs) ?? [];
  }, [exceptionListItems, isEdit, selectedOs]);

  return (
    <>
      <SectionHeader size="xs">
        <h3>{i18n.RULE_EXCEPTION_CONDITIONS}</h3>
      </SectionHeader>
      {includesRuleWithEQLSequenceStatement && (
        <>
          <EuiCallOut
            announceOnMount
            data-test-subj="eqlSequenceCallout"
            title={eqlCalloutWarning}
          />
          <EuiSpacer />
        </>
      )}
      {onAppliesToChange != null && (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow label={i18n.APPLIES_TO_LABEL}>
            <EuiButtonGroup
              legend={i18n.APPLIES_TO_LEGEND}
              options={appliesToOptions}
              idSelected={appliesTo}
              onChange={handleAppliesToChange}
              data-test-subj="exceptionAppliesTo"
            />
          </EuiFormRow>
        </>
      )}
      {onAppliesToChange == null && isEsqlOutputColumns && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" data-test-subj="exceptionItemAppliesTo">
            <dl>
              <dt>{i18n.APPLIES_TO_LABEL}</dt>
              <dd>{i18n.APPLIES_TO_COMPUTED_COLUMNS}</dd>
            </dl>
          </EuiText>
        </>
      )}
      {isEsqlOutputColumns && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            size="s"
            title={
              hasNoEsqlRule
                ? i18n.COMPUTED_COLUMNS_NO_EFFECT_WARNING_TITLE
                : i18n.COMPUTED_COLUMNS_WARNING_TITLE
            }
            data-test-subj="exceptionComputedColumnsWarning"
          >
            {hasNoEsqlRule
              ? i18n.COMPUTED_COLUMNS_NO_EFFECT_WARNING_BODY
              : i18n.COMPUTED_COLUMNS_WARNING_BODY}
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiText size="s">{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
      <EuiSpacer size="s" />
      {showOsTypeOptions && !isEdit && (
        <>
          <EuiFormRow label={sharedI18n.OPERATING_SYSTEM_LABEL}>
            <EuiComboBox
              placeholder={i18n.OPERATING_SYSTEM_PLACEHOLDER}
              singleSelection={osSingleSelectionOptions}
              options={OS_OPTIONS}
              selectedOptions={selectedOStoOptions}
              onChange={handleOSSelectionChange}
              isClearable={false}
              data-test-subj="osSelectionDropdown"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
        </>
      )}
      {showOsTypeOptions && isEdit && (
        <>
          <EuiText size="xs" data-test-subj="exceptionItemSelectedOs">
            <dl>
              <dt>{sharedI18n.OPERATING_SYSTEM_LABEL}</dt>
              <dd>{osDisplay(osTypes)}</dd>
            </dl>
          </EuiText>
          <EuiSpacer />
        </>
      )}
      {/* The builder starts again when what the item applies to changes, because the entries of one kind are not those of the other */}
      <React.Fragment key={appliesTo}>
        {getExceptionBuilderComponentLazy({
          allowLargeValueLists,
          appliesTo,
          httpService: http,
          autocompleteService: kql.autocomplete,
          exceptionListItems: isEsqlOutputColumns && !isEdit ? [] : exceptionListItems,
          listType: exceptionListType,
          osTypes,
          listId: listIdToUse,
          listNamespaceType,
          exceptionItemName,
          indexPatterns,
          isOrDisabled: isExceptionBuilderFormDisabled,
          isAndDisabled: isExceptionBuilderFormDisabled,
          isNestedDisabled: isExceptionBuilderFormDisabled,
          dataTestSubj: 'alertExceptionBuilder',
          idAria: 'alertExceptionBuilder',
          onChange: handleBuilderOnChange,
          isDisabled: isExceptionBuilderFormDisabled,
          allowCustomFieldOptions: !isEndpointException,
          getExtendedFields,
          showValueListModal: ShowValueListModal,
        })}
      </React.Fragment>
    </>
  );
};

export const ExceptionsConditions = React.memo(ExceptionsConditionsComponent);

ExceptionsConditions.displayName = 'ExceptionsConditions';
