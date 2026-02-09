/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';

import { isEqual } from 'lodash';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiFieldText,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  EuiHorizontalRule,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ExceptionListItemSchema, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  hasWrongOperatorWithWildcard,
  hasPartialCodeSignatureEntry,
} from '@kbn/securitysolution-list-utils';
import {
  WildCardWithWrongOperatorCallout,
  PartialCodeSignatureCallout,
} from '@kbn/securitysolution-exception-list-components';
import { OperatingSystem } from '@kbn/securitysolution-utils';

import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type { OnChangeProps } from '@kbn/lists-plugin/public';
import type { ValueSuggestionsGetFn } from '@kbn/kql/public/autocomplete/providers/value_suggestion_provider';
import type { EffectedPolicySelectProps } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import { useCanAssignArtifactPerPolicy } from '../../../../hooks/artifacts';
import { useSuggestions } from '../../../../hooks/use_suggestions';
import {
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
  alertsIndexPattern,
} from '../../../../../../common/endpoint/constants';
import { useFetchIndex } from '../../../../../common/containers/source';
import type { ExceptionEntries } from '../../../../../../common/endpoint/types/exception_list_items';
import { FormattedError } from '../../../../components/formatted_error';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { Loader } from '../../../../../common/components/loader';
import { useKibana } from '../../../../../common/lib/kibana';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { getAddedFieldsCounts, computeHasDuplicateFields } from '../../../../common/utils';

import {
  ABOUT_ENDPOINT_EXCEPTIONS,
  NAME_LABEL,
  NAME_ERROR,
  DESCRIPTION_LABEL,
  OS_LABEL,
} from '../../translations';
import {
  OS_TITLES,
  CONFIRM_WARNING_MODAL_LABELS,
  OPERATING_SYSTEM_WINDOWS_AND_MAC,
} from '../../../../common/translations';
import { ENDPOINT_EXCEPTIONS_LIST_DEFINITION } from '../../constants';

import { ExceptionItemComments } from '../../../../../detection_engine/rule_exceptions/components/item_comments';
import { ShowValueListModal } from '../../../../../value_list/components/show_value_list_modal';
import { EndpointExceptionsApiClient } from '../../service/api_client';

const ENDPOINT_ALERTS_INDEX_NAMES = [alertsIndexPattern];

const OS_OPTIONS: Array<EuiSuperSelectOption<OsTypeArray>> = [
  {
    inputDisplay: OS_TITLES[OperatingSystem.WINDOWS],
    value: [OperatingSystem.WINDOWS],
  },
  {
    inputDisplay: OS_TITLES[OperatingSystem.MAC],
    value: [OperatingSystem.MAC],
  },
  {
    inputDisplay: OS_TITLES[OperatingSystem.LINUX],
    value: [OperatingSystem.LINUX],
  },
  {
    inputDisplay: OPERATING_SYSTEM_WINDOWS_AND_MAC,
    value: [OperatingSystem.WINDOWS, OperatingSystem.MAC],
  },
];

const defaultConditionEntry = (): ExceptionListItemSchema['entries'] => [
  {
    field: '',
    operator: 'included',
    type: 'match',
    value: '',
  },
];

const cleanupEntries = (item: ArtifactFormComponentProps['item']) =>
  item.entries.forEach(
    (e: ArtifactFormComponentProps['item']['entries'][number] & { id?: string }) => {
      delete e.id;
    }
  );

export type EndpointExceptionsFormProps = ArtifactFormComponentProps & {
  allowSelectOs?: boolean;
};

export const EndpointExceptionsForm: React.FC<EndpointExceptionsFormProps> = memo(
  ({ allowSelectOs = true, item: exception, onChange, mode, error: submitError }) => {
    const getTestId = useTestIdGenerator('endpointExceptions-form');
    const { http } = useKibana().services;

    const getSuggestionsFn = useCallback<ValueSuggestionsGetFn>(
      ({ field, query }) => {
        const endpointExceptionsAPIClient = new EndpointExceptionsApiClient(http);
        return endpointExceptionsAPIClient.getSuggestions({ field: field.name, query });
      },
      [http]
    );

    const autocompleteSuggestions = useSuggestions(getSuggestionsFn);

    const [hasFormChanged, setHasFormChanged] = useState(false);
    const [hasNameError, toggleHasNameError] = useState<boolean>(!exception.name);
    const [newComment, setNewComment] = useState('');
    const [hasCommentError, setHasCommentError] = useState(false);
    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const [hasDuplicateFields, setHasDuplicateFields] = useState<boolean>(false);
    const [hasWildcardWithWrongOperator, setHasWildcardWithWrongOperator] = useState<boolean>(
      hasWrongOperatorWithWildcard([exception])
    );
    const [hasPartialCodeSignatureWarning, setHasPartialCodeSignatureWarning] = useState<boolean>(
      hasPartialCodeSignatureEntry([exception])
    );

    const showAssignmentSection = useCanAssignArtifactPerPolicy(exception, mode, hasFormChanged);

    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(
      ENDPOINT_ALERTS_INDEX_NAMES,
      undefined,
      ENDPOINT_FIELDS_SEARCH_STRATEGY
    );

    const [areConditionsValid, setAreConditionsValid] = useState(!!exception.entries.length);

    const [existingComments, _] = useState<ExceptionListItemSchema['comments']>(
      (exception as ExceptionListItemSchema)?.comments
    );

    const isFormValid = useMemo(() => {
      // verify that it has legit entries
      // and not just default entry without values
      return (
        !hasNameError &&
        !hasCommentError &&
        !!exception.entries.length &&
        (exception.entries as ExceptionEntries).some((e) => e.value !== '' || e.value.length)
      );
    }, [hasCommentError, hasNameError, exception.entries]);

    const processChanged = useCallback(
      (updatedItem?: Partial<ArtifactFormComponentProps['item']>) => {
        const item = updatedItem
          ? {
              ...exception,
              ...updatedItem,
            }
          : exception;
        cleanupEntries(item);
        onChange({
          item,
          isValid: isFormValid && areConditionsValid && hasFormChanged,
          confirmModalLabels: hasWildcardWithWrongOperator
            ? CONFIRM_WARNING_MODAL_LABELS(
                i18n.translate(
                  'xpack.securitySolution.endpointException.flyoutForm.confirmModal.name',
                  {
                    defaultMessage: 'endpoint exception',
                  }
                )
              )
            : undefined,
        });
      },
      [
        areConditionsValid,
        exception,
        hasFormChanged,
        isFormValid,
        onChange,
        hasWildcardWithWrongOperator,
      ]
    );

    const endpointExceptionItem = useMemo<ArtifactFormComponentProps['item']>(() => {
      const ef: ArtifactFormComponentProps['item'] = exception;
      ef.entries = exception.entries.length
        ? (exception.entries as ExceptionListItemSchema['entries'])
        : defaultConditionEntry();

      cleanupEntries(ef);

      setAreConditionsValid(!!exception.entries.length);
      return ef;
    }, [exception]);

    const handleOnChangeName = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!exception) return;
        const name = event.target.value.trim();
        toggleHasNameError(!name);
        processChanged({ name });
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [exception, hasFormChanged, processChanged]
    );

    const nameInputMemo = useMemo(
      () => (
        <EuiFormRow
          label={NAME_LABEL}
          fullWidth
          isInvalid={hasNameError && hasBeenInputNameVisited}
          error={NAME_ERROR}
        >
          <EuiFieldText
            isInvalid={hasNameError && hasBeenInputNameVisited}
            aria-label={NAME_LABEL}
            id="endpointExceptionFormInputName"
            defaultValue={exception?.name ?? ''}
            data-test-subj={getTestId('name-input')}
            fullWidth
            maxLength={256}
            required={hasBeenInputNameVisited}
            onChange={handleOnChangeName}
            onBlur={() => !hasBeenInputNameVisited && setHasBeenInputNameVisited(true)}
          />
        </EuiFormRow>
      ),
      [getTestId, hasNameError, handleOnChangeName, hasBeenInputNameVisited, exception?.name]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!exception) return;
        if (!hasFormChanged) setHasFormChanged(true);
        processChanged({ description: event.target.value.toString().trim() });
      },
      [exception, hasFormChanged, processChanged]
    );
    const descriptionInputMemo = useMemo(
      () => (
        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
          <EuiTextArea
            id="endpointExceptionFormInputDescription"
            defaultValue={exception?.description ?? ''}
            onChange={handleOnDescriptionChange}
            fullWidth
            data-test-subj={getTestId('description-input')}
            aria-label={DESCRIPTION_LABEL}
            maxLength={256}
          />
        </EuiFormRow>
      ),
      [exception?.description, getTestId, handleOnDescriptionChange]
    );

    const handleOnOsChange = useCallback(
      (os: OsTypeArray) => {
        if (!exception) return;
        processChanged({
          os_types: os,
          entries: exception.entries,
        });
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [exception, hasFormChanged, processChanged]
    );

    const osInputMemo = useMemo(
      () => (
        <EuiFormRow label={OS_LABEL} fullWidth>
          <EuiSuperSelect
            name="os"
            options={OS_OPTIONS}
            fullWidth
            data-test-subj={getTestId('osSelectField')}
            valueOfSelected={
              OS_OPTIONS.find(
                (option) => JSON.stringify(option.value) === JSON.stringify(exception?.os_types)
              )?.value
            }
            onChange={handleOnOsChange}
          />
        </EuiFormRow>
      ),
      [getTestId, handleOnOsChange, exception?.os_types]
    );

    const handleOnChangeComment = useCallback(
      (value: string) => {
        if (!exception) return;
        setNewComment(value);
        processChanged({ comments: [{ comment: value }] });
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [exception, hasFormChanged, processChanged]
    );
    const commentsInputMemo = useMemo(
      () => (
        <ExceptionItemComments
          exceptionItemComments={existingComments}
          newCommentValue={newComment}
          newCommentOnChange={handleOnChangeComment}
          setCommentError={setHasCommentError}
        />
      ),
      [existingComments, handleOnChangeComment, newComment]
    );

    const commentsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.endpointException.commentsSectionTitle"
                defaultMessage="Comments"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpointException.commentsSectionDescription"
                defaultMessage="Add a comment to your endpoint exception."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {commentsInputMemo}
        </>
      ),
      [commentsInputMemo]
    );

    const detailsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.endpointException.detailsSectionTitle"
                defaultMessage="Details"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>{ABOUT_ENDPOINT_EXCEPTIONS}</p>
          </EuiText>
          <EuiSpacer size="m" />
          {nameInputMemo}
          {descriptionInputMemo}
        </>
      ),
      [nameInputMemo, descriptionInputMemo]
    );

    const handleOnBuilderChange = useCallback(
      (arg: OnChangeProps) => {
        const isCalledWithoutChanges =
          (!hasFormChanged && arg.exceptionItems[0] === undefined) ||
          isEqual(arg.exceptionItems[0]?.entries, exception?.entries);

        if (isCalledWithoutChanges) {
          const addedFields = arg.exceptionItems[0]?.entries.map((e) => e.field) || [''];

          setHasDuplicateFields(computeHasDuplicateFields(getAddedFieldsCounts(addedFields)));
          return;
        } else {
          setHasDuplicateFields(false);
        }

        // handle wildcard with wrong operator case
        setHasWildcardWithWrongOperator(hasWrongOperatorWithWildcard(arg.exceptionItems));
        setHasPartialCodeSignatureWarning(hasPartialCodeSignatureEntry(arg.exceptionItems));

        const updatedItem: Partial<ArtifactFormComponentProps['item']> =
          arg.exceptionItems[0] !== undefined
            ? {
                ...arg.exceptionItems[0],
                name: exception?.name ?? '',
                description: exception?.description ?? '',
                comments: exception?.comments ?? [],
                os_types: exception?.os_types ?? [OperatingSystem.WINDOWS],
                tags: exception?.tags ?? [],
                meta: exception.meta,
              }
            : {
                ...exception,
                entries: [{ field: '', operator: 'included', type: 'match', value: '' }],
              };
        const hasValidConditions =
          arg.exceptionItems[0] !== undefined
            ? !(arg.errorExists && !arg.exceptionItems[0]?.entries?.length)
            : false;

        setAreConditionsValid(hasValidConditions);
        processChanged(updatedItem);
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [exception, hasFormChanged, processChanged]
    );

    const exceptionBuilderComponentMemo = useMemo(
      () =>
        getExceptionBuilderComponentLazy({
          allowLargeValueLists: false,
          httpService: http,
          autocompleteService: autocompleteSuggestions,
          exceptionListItems: [endpointExceptionItem as ExceptionListItemSchema],
          listType: ENDPOINT_EXCEPTIONS_LIST_DEFINITION.type,
          listId: ENDPOINT_EXCEPTIONS_LIST_DEFINITION.list_id,
          listNamespaceType: 'agnostic',
          indexPatterns,
          isOrDisabled: false,
          isAndDisabled: false,
          isNestedDisabled: false,
          dataTestSubj: 'endpoint-exception-builder',
          idAria: 'endpoint-exception-builder',
          onChange: handleOnBuilderChange,
          osTypes: exception.os_types,
          showValueListModal: ShowValueListModal,
        }),
      [
        http,
        autocompleteSuggestions,
        endpointExceptionItem,
        indexPatterns,
        handleOnBuilderChange,
        exception.os_types,
      ]
    );

    const criteriaSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.endpointException.criteriaSectionTitle"
                defaultMessage="Conditions"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              {allowSelectOs ? (
                <FormattedMessage
                  id="xpack.securitySolution.endpointException.criteriaSectionDescription.withOs"
                  defaultMessage="Select an operating system and add conditions."
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpointException.criteriaSectionDescription.withoutOs"
                  defaultMessage="Add conditions."
                />
              )}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {allowSelectOs ? (
            <>
              {osInputMemo}
              <EuiSpacer />
            </>
          ) : null}
          {exceptionBuilderComponentMemo}
        </>
      ),
      [allowSelectOs, exceptionBuilderComponentMemo, osInputMemo]
    );

    const handleEffectedPolicyOnChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (updatedItem) => {
        processChanged({ tags: updatedItem.tags ?? [] });
        if (!hasFormChanged) {
          setHasFormChanged(true);
        }
      },
      [hasFormChanged, processChanged]
    );

    const policiesSection = useMemo(
      () => (
        <EffectedPolicySelect
          item={exception}
          onChange={handleEffectedPolicyOnChange}
          data-test-subj={getTestId('effectedPolicies')}
        />
      ),
      [exception, handleEffectedPolicyOnChange, getTestId]
    );

    useEffect(() => {
      processChanged();
    }, [processChanged]);

    if (isIndexPatternLoading || !exception) {
      return <Loader size="xl" />;
    }

    return (
      <EuiForm
        component="div"
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={getTestId('submitError')} />
          ) : undefined
        }
        isInvalid={!!submitError}
      >
        {detailsSection}
        <EuiHorizontalRule />
        {criteriaSection}
        {hasWildcardWithWrongOperator && <WildCardWithWrongOperatorCallout />}
        {hasWildcardWithWrongOperator && hasPartialCodeSignatureWarning && <EuiSpacer size="xs" />}
        {hasPartialCodeSignatureWarning && <PartialCodeSignatureCallout />}
        {hasDuplicateFields && (
          <>
            <EuiSpacer size="xs" />
            <EuiText color="subdued" size="xs" data-test-subj="duplicate-fields-warning-message">
              <FormattedMessage
                id="xpack.securitySolution.endpointException.warningMessage.duplicateFields"
                defaultMessage="Using multiples of the same field values can degrade Endpoint performance and/or create ineffective rules"
              />
            </EuiText>
          </>
        )}

        {showAssignmentSection && (
          <>
            <EuiHorizontalRule />
            {policiesSection}
          </>
        )}

        <EuiHorizontalRule />
        {commentsSection}
      </EuiForm>
    );
  }
);

EndpointExceptionsForm.displayName = 'EndpointExceptionsForm';
