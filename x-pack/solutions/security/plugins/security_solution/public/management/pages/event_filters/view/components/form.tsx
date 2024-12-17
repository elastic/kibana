/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';

import { isEqual } from 'lodash';
import type { EuiButtonGroupOptionProps, EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiFieldText,
  EuiSpacer,
  EuiFlexGroup,
  EuiButtonGroup,
  useEuiTheme,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  EuiHorizontalRule,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  EVENT_FILTERS_OPERATORS,
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
import type { ValueSuggestionsGetFn } from '@kbn/unified-search-plugin/public/autocomplete/providers/value_suggestion_provider';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useGetUpdatedTags } from '../../../../hooks/artifacts';
import {
  FILTER_PROCESS_DESCENDANTS_TAG,
  PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY,
  PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import {
  isFilterProcessDescendantsEnabled,
  isFilterProcessDescendantsTag,
  isPolicySelectionTag,
} from '../../../../../../common/endpoint/service/artifacts/utils';
import {
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
  eventsIndexPattern,
} from '../../../../../../common/endpoint/constants';
import { useSuggestions } from '../../../../hooks/use_suggestions';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import { useFetchIndex } from '../../../../../common/containers/source';
import { Loader } from '../../../../../common/components/loader';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useKibana } from '../../../../../common/lib/kibana';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import {
  isArtifactGlobal,
  getPolicyIdsFromArtifact,
  getArtifactTagsByPolicySelection,
} from '../../../../../../common/endpoint/service/artifacts';

import {
  ABOUT_EVENT_FILTERS,
  NAME_LABEL,
  NAME_ERROR,
  DESCRIPTION_LABEL,
  OS_LABEL,
  RULE_NAME,
} from '../event_filters_list';
import { OS_TITLES, CONFIRM_WARNING_MODAL_LABELS } from '../../../../common/translations';
import { ENDPOINT_EVENT_FILTERS_LIST_ID, EVENT_FILTER_LIST_TYPE } from '../../constants';

import type { EffectedPolicySelection } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import { ExceptionItemComments } from '../../../../../detection_engine/rule_exceptions/components/item_comments';
import { EventFiltersApiClient } from '../../service/api_client';
import { ShowValueListModal } from '../../../../../value_list/components/show_value_list_modal';
import { ProcessDescendantsTooltip } from './process_descendant_tooltip';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

// OS options
const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = OPERATING_SYSTEMS.map((os) => ({
  value: os,
  inputDisplay: OS_TITLES[os],
}));

// Defines the tag categories for Event Filters, using the given order.
const TAG_FILTERS = Object.freeze({
  policySelection: isPolicySelectionTag,
  processDescendantsFiltering: isFilterProcessDescendantsTag,
});

const getAddedFieldsCounts = (formFields: string[]): { [k: string]: number } =>
  formFields.reduce<{ [k: string]: number }>((allFields, field) => {
    if (field in allFields) {
      allFields[field]++;
    } else {
      allFields[field] = 1;
    }
    return allFields;
  }, {});

const computeHasDuplicateFields = (formFieldsList: Record<string, number>): boolean =>
  Object.values(formFieldsList).some((e) => e > 1);

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

type EventFilterItemEntries = Array<{
  field: string;
  value: string;
  operator: 'included' | 'excluded';
  type: Exclude<ExceptionListItemSchema['entries'][number]['type'], 'list'>;
}>;

export const EventFiltersForm: React.FC<ArtifactFormComponentProps & { allowSelectOs?: boolean }> =
  memo(({ allowSelectOs = true, item: exception, policies, policiesIsLoading, onChange, mode }) => {
    const getTestId = useTestIdGenerator('eventFilters-form');
    const { http } = useKibana().services;

    const getSuggestionsFn = useCallback<ValueSuggestionsGetFn>(
      ({ field, query }) => {
        const eventFiltersAPIClient = new EventFiltersApiClient(http);
        return eventFiltersAPIClient.getSuggestions({ field: field.name, query });
      },
      [http]
    );

    const autocompleteSuggestions = useSuggestions(getSuggestionsFn);
    const [hasFormChanged, setHasFormChanged] = useState(false);
    const [hasNameError, toggleHasNameError] = useState<boolean>(!exception.name);
    const [newComment, setNewComment] = useState('');
    const [hasCommentError, setHasCommentError] = useState(false);
    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const [selectedPolicies, setSelectedPolicies] = useState<PolicyData[]>([]);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isGlobal = useMemo(() => isArtifactGlobal(exception), [exception]);
    const [wasByPolicy, setWasByPolicy] = useState(!isArtifactGlobal(exception));
    const [hasDuplicateFields, setHasDuplicateFields] = useState<boolean>(false);
    const [hasWildcardWithWrongOperator, setHasWildcardWithWrongOperator] = useState<boolean>(
      hasWrongOperatorWithWildcard([exception])
    );

    const [hasPartialCodeSignatureWarning, setHasPartialCodeSignatureWarning] =
      useState<boolean>(false);

    // This value has to be memoized to avoid infinite useEffect loop on useFetchIndex
    const indexNames = useMemo(() => [eventsIndexPattern], []);
    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(
      indexNames,
      undefined,
      ENDPOINT_FIELDS_SEARCH_STRATEGY
    );
    const { getTagsUpdatedBy } = useGetUpdatedTags(exception, TAG_FILTERS);
    const euiTheme = useEuiTheme();

    const isFilterProcessDescendantsFeatureEnabled = useIsExperimentalFeatureEnabled(
      'filterProcessDescendantsForEventFiltersEnabled'
    );

    const isFilterProcessDescendantsSelected = useMemo(
      () => isFilterProcessDescendantsEnabled(exception),
      [exception]
    );

    const [areConditionsValid, setAreConditionsValid] = useState(
      !!exception.entries.length || false
    );
    // compute this for initial render only
    const existingComments = useMemo<ExceptionListItemSchema['comments']>(
      () => (exception as ExceptionListItemSchema)?.comments,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const showAssignmentSection = useMemo(() => {
      return (
        isPlatinumPlus ||
        (mode === 'edit' && (!isGlobal || (wasByPolicy && isGlobal && hasFormChanged)))
      );
    }, [mode, isGlobal, hasFormChanged, isPlatinumPlus, wasByPolicy]);

    const isFormValid = useMemo(() => {
      // verify that it has legit entries
      // and not just default entry without values
      return (
        !hasNameError &&
        !hasCommentError &&
        !!exception.entries.length &&
        (exception.entries as EventFilterItemEntries).some((e) => e.value !== '' || e.value.length)
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
          isValid: isFormValid && areConditionsValid,
          confirmModalLabels: hasWildcardWithWrongOperator
            ? CONFIRM_WARNING_MODAL_LABELS(
                i18n.translate('xpack.securitySolution.eventFilter.flyoutForm.confirmModal.name', {
                  defaultMessage: 'event filter',
                })
              )
            : undefined,
        });
      },
      [areConditionsValid, exception, isFormValid, onChange, hasWildcardWithWrongOperator]
    );

    // set initial state of `wasByPolicy` that checks
    // if the initial state of the exception was by policy or not
    useEffect(() => {
      if (!hasFormChanged && exception.tags) {
        setWasByPolicy(!isArtifactGlobal({ tags: exception.tags }));
      }
    }, [exception.tags, hasFormChanged]);

    // select policies if editing
    useEffect(() => {
      if (hasFormChanged) return;
      const policyIds = exception.tags ? getPolicyIdsFromArtifact({ tags: exception.tags }) : [];

      if (!policyIds.length) return;
      const policiesData = policies.filter((policy) => policyIds.includes(policy.id));
      setSelectedPolicies(policiesData);
    }, [hasFormChanged, exception, policies]);

    const eventFilterItem = useMemo<ArtifactFormComponentProps['item']>(() => {
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

    // name and handler
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
            aria-label={NAME_LABEL}
            id="eventFiltersFormInputName"
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

    // description and handler
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
            id="eventFiltersFormInputDescription"
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

    // selected OS and handler
    const selectedOs = useMemo((): OperatingSystem => {
      if (!exception?.os_types?.length) {
        return OperatingSystem.WINDOWS;
      }
      return exception.os_types[0] as OperatingSystem;
    }, [exception?.os_types]);

    const handleOnOsChange = useCallback(
      (os: OperatingSystem) => {
        if (!exception) return;
        processChanged({
          os_types: [os],
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
            options={osOptions}
            fullWidth
            valueOfSelected={selectedOs}
            onChange={handleOnOsChange}
          />
        </EuiFormRow>
      ),
      [handleOnOsChange, selectedOs]
    );

    // comments and handler
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

    // comments
    const commentsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.commentsSectionTitle"
                defaultMessage="Comments"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.commentsSectionDescription"
                defaultMessage="Add a comment to your event filter."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {commentsInputMemo}
        </>
      ),
      [commentsInputMemo]
    );

    // details
    const detailsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.detailsSectionTitle"
                defaultMessage="Details"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>{ABOUT_EVENT_FILTERS}</p>
          </EuiText>
          <EuiSpacer size="m" />
          {nameInputMemo}
          {descriptionInputMemo}
        </>
      ),
      [nameInputMemo, descriptionInputMemo]
    );

    const handleFilterTypeOnChange = useCallback(
      (id: string) => {
        const newTagsForDescendants = id === 'descendants' ? [FILTER_PROCESS_DESCENDANTS_TAG] : [];

        const tags = getTagsUpdatedBy('processDescendantsFiltering', newTagsForDescendants);

        processChanged({ tags });
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [getTagsUpdatedBy, hasFormChanged, processChanged]
    );

    const filterTypeOptions: EuiButtonGroupOptionProps[] = useMemo(() => {
      return [
        {
          id: 'events',
          label: (
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.filterProcessDescendants.eventsButton"
                defaultMessage="Events"
              />
            </EuiText>
          ),
          iconType: isFilterProcessDescendantsSelected ? 'empty' : 'checkInCircleFilled',
          'data-test-subj': getTestId('filterEventsButton'),
        },
        {
          id: 'descendants',
          label: (
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.filterProcessDescendants.processDescendantsButton"
                  defaultMessage="Process Descendants"
                />
              </EuiText>
              <ProcessDescendantsTooltip
                data-test-subj={getTestId('filterProcessDescendantsTooltip')}
              />
            </EuiFlexGroup>
          ),
          iconType: isFilterProcessDescendantsSelected ? 'checkInCircleFilled' : 'empty',
          'data-test-subj': getTestId('filterProcessDescendantsButton'),
        },
      ];
    }, [getTestId, isFilterProcessDescendantsSelected]);

    const filterTypeSubsection = useMemo(() => {
      if (!isFilterProcessDescendantsFeatureEnabled) return null;

      return (
        <>
          <EuiButtonGroup
            legend="Events or Process descendants selector"
            color="primary"
            onChange={handleFilterTypeOnChange}
            css={css`
              .euiButtonGroupButton {
                padding-right: ${euiTheme.euiTheme.size.l};
              }
            `}
            options={filterTypeOptions}
            idSelected={isFilterProcessDescendantsSelected ? 'descendants' : 'events'}
          />
          <EuiSpacer size="m" />

          {isFilterProcessDescendantsSelected && (
            <>
              <EuiText
                size="s"
                data-test-subj={getTestId(
                  'filterProcessDescendants-additionalConditionDescription'
                )}
              >
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.filterProcessDescendants.additionalConditionDescription"
                  defaultMessage="Additional condition added:"
                />
              </EuiText>
              <code>{PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT}</code>
              <EuiSpacer size="m" />
            </>
          )}
        </>
      );
    }, [
      isFilterProcessDescendantsFeatureEnabled,
      handleFilterTypeOnChange,
      euiTheme.euiTheme.size.l,
      filterTypeOptions,
      isFilterProcessDescendantsSelected,
      getTestId,
    ]);

    // conditions and handler
    const handleOnBuilderChange = useCallback(
      (arg: OnChangeProps) => {
        const hasDuplicates =
          (!hasFormChanged && arg.exceptionItems[0] === undefined) ||
          isEqual(arg.exceptionItems[0]?.entries, exception?.entries);

        if (hasDuplicates) {
          const addedFields = arg.exceptionItems[0]?.entries.map((e) => e.field) || [''];

          if (isFilterProcessDescendantsFeatureEnabled && isFilterProcessDescendantsSelected) {
            addedFields.push(PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY.field);
          }

          setHasDuplicateFields(computeHasDuplicateFields(getAddedFieldsCounts(addedFields)));
          if (!hasFormChanged) setHasFormChanged(true);
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
      [
        exception,
        hasFormChanged,
        isFilterProcessDescendantsFeatureEnabled,
        isFilterProcessDescendantsSelected,
        processChanged,
      ]
    );
    const exceptionBuilderComponentMemo = useMemo(
      () =>
        getExceptionBuilderComponentLazy({
          allowLargeValueLists: false,
          httpService: http,
          autocompleteService: autocompleteSuggestions,
          exceptionListItems: [eventFilterItem as ExceptionListItemSchema],
          listType: EVENT_FILTER_LIST_TYPE,
          listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
          listNamespaceType: 'agnostic',
          ruleName: RULE_NAME,
          indexPatterns,
          isOrDisabled: true,
          isOrHidden: true,
          isAndDisabled: false,
          isNestedDisabled: false,
          dataTestSubj: 'alert-exception-builder',
          idAria: 'alert-exception-builder',
          onChange: handleOnBuilderChange,
          operatorsList: EVENT_FILTERS_OPERATORS,
          osTypes: exception.os_types,
          showValueListModal: ShowValueListModal,
        }),
      [
        autocompleteSuggestions,
        handleOnBuilderChange,
        http,
        indexPatterns,
        exception,
        eventFilterItem,
      ]
    );

    // conditions
    const criteriaSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.criteriaSectionTitle"
                defaultMessage="Conditions"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              {allowSelectOs ? (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.criteriaSectionDescription.withOs"
                  defaultMessage="Select an operating system and add conditions."
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.criteriaSectionDescription.withoutOs"
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
          {filterTypeSubsection}
          {exceptionBuilderComponentMemo}
        </>
      ),
      [allowSelectOs, exceptionBuilderComponentMemo, osInputMemo, filterTypeSubsection]
    );

    // policy and handler
    const handleOnPolicyChange = useCallback(
      (change: EffectedPolicySelection) => {
        const policySelectionTags = getArtifactTagsByPolicySelection(change);

        // Preserve old selected policies when switching to global
        if (!change.isGlobal) {
          setSelectedPolicies(change.selected);
        }

        const tags = getTagsUpdatedBy('policySelection', policySelectionTags);
        processChanged({ tags });
        if (!hasFormChanged) setHasFormChanged(true);
      },
      [processChanged, getTagsUpdatedBy, hasFormChanged]
    );

    const policiesSection = useMemo(
      () => (
        <EffectedPolicySelect
          selected={selectedPolicies}
          options={policies}
          isGlobal={isGlobal}
          isLoading={policiesIsLoading}
          isPlatinumPlus={isPlatinumPlus}
          onChange={handleOnPolicyChange}
          data-test-subj={getTestId('effectedPolicies')}
        />
      ),
      [
        selectedPolicies,
        policies,
        isGlobal,
        policiesIsLoading,
        isPlatinumPlus,
        handleOnPolicyChange,
        getTestId,
      ]
    );

    useEffect(() => {
      processChanged();
    }, [processChanged]);

    if (isIndexPatternLoading || !exception) {
      return <Loader size="xl" />;
    }

    return (
      <EuiForm component="div">
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
                id="xpack.securitySolution.eventFilters.warningMessage.duplicateFields"
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
  });

EventFiltersForm.displayName = 'EventFiltersForm';
