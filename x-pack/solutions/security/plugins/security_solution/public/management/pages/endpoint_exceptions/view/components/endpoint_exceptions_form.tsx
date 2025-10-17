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
import { useFetchIndexPatterns } from '../../../../../detection_engine/rule_exceptions/logic/use_exception_flyout_data';
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

const cleanupEntries = (
  item: ArtifactFormComponentProps['item']
): ArtifactFormComponentProps['item']['entries'] => {
  return item.entries.map(
    (e: ArtifactFormComponentProps['item']['entries'][number] & { id?: string }) => {
      delete e.id;
      return e;
    }
  );
};

// todo: do we need this?
type EndpointExceptionItemEntries = Array<{
  field: string;
  value: string;
  operator: 'included' | 'excluded';
  type: Exclude<ExceptionListItemSchema['entries'][number]['type'], 'list'>;
}>;

export const EndpointExceptionsForm: React.FC<
  ArtifactFormComponentProps & { allowSelectOs?: boolean }
> = memo(({ allowSelectOs = true, item: exception, onChange, mode, error: submitError }) => {
  const getTestId = useTestIdGenerator('endpointExceptions-form');
  const { http, unifiedSearch } = useKibana().services;

  const [hasFormChanged, setHasFormChanged] = useState(false);
  const [hasNameError, toggleHasNameError] = useState<boolean>(!exception.name);
  const [newComment, setNewComment] = useState('');
  const [hasCommentError, setHasCommentError] = useState(false);
  const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
  const [hasDuplicateFields, setHasDuplicateFields] = useState<boolean>(false);
  const [hasWildcardWithWrongOperator, setHasWildcardWithWrongOperator] = useState<boolean>(
    hasWrongOperatorWithWildcard([exception])
  );

  const [hasPartialCodeSignatureWarning, setHasPartialCodeSignatureWarning] =
    useState<boolean>(false);

  const {
    isLoading: isIndexPatternLoading,
    indexPatterns,
    getExtendedFields,
  } = useFetchIndexPatterns(null);

  const [areConditionsValid, setAreConditionsValid] = useState(!!exception.entries.length);
  // compute this for initial render only
  const existingComments = useMemo<ExceptionListItemSchema['comments']>(
    () => (exception as ExceptionListItemSchema)?.comments,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isFormValid = useMemo(() => {
    // verify that it has legit entries
    // and not just default entry without values
    return (
      !hasNameError &&
      !hasCommentError &&
      !!exception.entries.length &&
      (exception.entries as EndpointExceptionItemEntries).some(
        (e) => e.value !== '' || e.value.length
      )
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

    // TODO: `id` gets added to the exception.entries item
    // Is there a simpler way to this?
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
          valueOfSelected={
            OS_OPTIONS.find(
              (option) => JSON.stringify(option.value) === JSON.stringify(exception?.os_types)
            )?.value
          }
          onChange={handleOnOsChange}
        />
      </EuiFormRow>
    ),
    [handleOnOsChange, exception?.os_types]
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
        autocompleteService: unifiedSearch.autocomplete,
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
        getExtendedFields,
      }),
    [
      http,
      unifiedSearch.autocomplete,
      endpointExceptionItem,
      indexPatterns,
      handleOnBuilderChange,
      exception.os_types,
      getExtendedFields,
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

      <EuiHorizontalRule />
      {commentsSection}
    </EuiForm>
  );
});

EndpointExceptionsForm.displayName = 'EndpointExceptionsForm';
