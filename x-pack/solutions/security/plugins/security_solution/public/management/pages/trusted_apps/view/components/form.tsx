/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEventHandler } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiFieldTextProps, EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSuperSelect,
  EuiTextArea,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AllConditionEntryFields, EntryTypes } from '@kbn/securitysolution-utils';
import {
  hasSimpleExecutableName,
  validateHasWildcardWithWrongOperator,
  isPathValid,
  ConditionEntryField,
  OperatingSystem,
} from '@kbn/securitysolution-utils';
import type { ValueSuggestionsGetFn } from '@kbn/unified-search-plugin/public/autocomplete/providers/value_suggestion_provider';
import { WildCardWithWrongOperatorCallout } from '@kbn/securitysolution-exception-list-components';
import { useKibana } from '../../../../../common/lib/kibana';
import { useCanAssignArtifactPerPolicy, useGetUpdatedTags } from '../../../../hooks/artifacts';
import { useSuggestions } from '../../../../hooks/use_suggestions'
import { useFetchIndex } from '../../../../../common/containers/source';
import {
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
  eventsIndexPattern,
} from '../../../../../../common/endpoint/constants';
import { FormattedError } from '../../../../components/formatted_error';
import type {
  TrustedAppConditionEntry,
  NewTrustedApp,
} from '../../../../../../common/endpoint/types';
import {
  isValidHash,
  getDuplicateFields,
} from '../../../../../../common/endpoint/service/artifacts/validations';

import { isSignerFieldExcluded } from '../../state/type_guards';

import {
  CONDITIONS_HEADER,
  CONDITIONS_HEADER_DESCRIPTION,
  DETAILS_HEADER,
  DETAILS_HEADER_DESCRIPTION,
  DESCRIPTION_LABEL,
  INPUT_ERRORS,
  NAME_LABEL,
  POLICY_SELECT_DESCRIPTION,
  SELECT_OS_LABEL,
} from '../translations';
import { OS_TITLES, CONFIRM_WARNING_MODAL_LABELS } from '../../../../common/translations';
import type { LogicalConditionBuilderProps } from './logical_condition';
import { LogicalConditionBuilder } from './logical_condition';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type { EffectedPolicySelectProps } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { TrustedAppsArtifactsDocsLink } from './artifacts_docs_link';
import { isAdvancedModeEnabled } from '../../../../../../common/endpoint/service/artifacts/utils';
import { ADVANCED_MODE_TAG } from '../../../../../../common/endpoint/service/artifacts/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { TrustedAppsApiClient } from '../../service';

interface FieldValidationState {
  /** If this fields state is invalid. Drives display of errors on the UI */
  isInvalid: boolean;
  errors: React.ReactNode[];
  warnings: React.ReactNode[];
}
interface ValidationResult {
  /** Overall indicator if form is valid */
  isValid: boolean;

  /** Individual form field validations */
  result: Partial<{
    [key in keyof NewTrustedApp]: FieldValidationState;
  }>;

  /**  Additional Warning callout after submit */
  extraWarning?: boolean;
}

const addResultToValidation = (
  validation: ValidationResult,
  field: keyof NewTrustedApp,
  type: 'warnings' | 'errors',
  resultValue: React.ReactNode,
  addToFront?: boolean
) => {
  if (!validation.result[field]) {
    validation.result[field] = {
      isInvalid: false,
      errors: [],
      warnings: [],
    };
  }
  const errorMarkup: React.ReactNode = type === 'warnings' ? <div>{resultValue}</div> : resultValue;

  if (addToFront) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    validation.result[field]![type].unshift(errorMarkup);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    validation.result[field]![type].push(errorMarkup);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  validation.result[field]!.isInvalid = true;
};

const validateValues = (values: ArtifactFormComponentProps['item']): ValidationResult => {
  let isValid: ValidationResult['isValid'] = true;
  const validation: ValidationResult = {
    isValid,
    result: {},
  };
  let extraWarning: ValidationResult['extraWarning'];

  // Name field
  if (!values.name.trim()) {
    isValid = false;
    addResultToValidation(validation, 'name', 'errors', INPUT_ERRORS.name);
  }

  if (!values.os_types) {
    isValid = false;
    addResultToValidation(validation, 'os', 'errors', INPUT_ERRORS.os);
  }

  const os = ((values.os_types ?? [])[0] as OperatingSystem) ?? OperatingSystem.WINDOWS;
  if (!values.entries.length) {
    isValid = false;
    addResultToValidation(validation, 'entries', 'errors', INPUT_ERRORS.field);
  } else {
    const duplicated = getDuplicateFields(values.entries as TrustedAppConditionEntry[]);
    if (duplicated.length) {
      isValid = false;
      duplicated.forEach((field: ConditionEntryField) => {
        addResultToValidation(
          validation,
          'entries',
          'errors',
          INPUT_ERRORS.noDuplicateField(field)
        );
      });
    }
    values.entries.forEach((entry, index) => {
      const isValidPathEntry = isPathValid({
        os,
        field: entry.field as AllConditionEntryFields,
        type: entry.type as EntryTypes,
        value: (entry as TrustedAppConditionEntry).value,
      });

      if (
        validateHasWildcardWithWrongOperator({
          operator: entry.type as EntryTypes,
          value: (entry as TrustedAppConditionEntry).value,
        })
      ) {
        if (entry.field === ConditionEntryField.PATH) {
          extraWarning = true;
          addResultToValidation(
            validation,
            'entries',
            'warnings',
            INPUT_ERRORS.wildcardWithWrongOperatorWarning(index)
          );
        } else {
          addResultToValidation(
            validation,
            'entries',
            'warnings',
            INPUT_ERRORS.wildcardWithWrongField(index)
          );
        }
      }

      if (!entry.field || !(entry as TrustedAppConditionEntry).value.trim()) {
        isValid = false;
        addResultToValidation(validation, 'entries', 'errors', INPUT_ERRORS.mustHaveValue(index));
      } else if (
        entry.field === ConditionEntryField.HASH &&
        !isValidHash((entry as TrustedAppConditionEntry).value)
      ) {
        isValid = false;
        addResultToValidation(validation, 'entries', 'errors', INPUT_ERRORS.invalidHash(index));
      } else if (!isValidPathEntry) {
        addResultToValidation(validation, 'entries', 'warnings', INPUT_ERRORS.pathWarning(index));
      } else if (
        isValidPathEntry &&
        !hasSimpleExecutableName({
          os,
          value: (entry as TrustedAppConditionEntry).value,
          type: entry.type as EntryTypes,
        })
      ) {
        if (entry.type === 'wildcard') {
          addResultToValidation(
            validation,
            'entries',
            'warnings',
            INPUT_ERRORS.wildcardPathWarning(index)
          );
        } else {
          addResultToValidation(validation, 'entries', 'warnings', INPUT_ERRORS.pathWarning(index));
        }
      }
    });
  }

  if (extraWarning) {
    addResultToValidation(
      validation,
      'entries',
      'errors',
      <>
        <EuiSpacer size="s" />
        <WildCardWithWrongOperatorCallout />
      </>,
      true
    );
    validation.extraWarning = extraWarning;
  }
  validation.isValid = isValid;
  return validation;
};

const defaultConditionEntry = (): TrustedAppConditionEntry<ConditionEntryField.HASH> => ({
  field: ConditionEntryField.HASH,
  operator: 'included',
  type: 'match',
  value: '',
});


export const TrustedAppsForm = memo<ArtifactFormComponentProps>(
  ({ item, onChange, mode, error: submitError }) => {
    const isTAAdvancedModeFeatureFlagEnabled = useIsExperimentalFeatureEnabled('trustedAppsAdvancedMode');
    const getTestId = useTestIdGenerator('trustedApps-form');
    const [visited, setVisited] = useState<
      Partial<{
        [key in keyof NewTrustedApp]: boolean;
      }>
    >({});
    const [hasFormChanged, setHasFormChanged] = useState(false);
    const showAssignmentSection = useCanAssignArtifactPerPolicy(item, mode, hasFormChanged);
    const [validationResult, setValidationResult] = useState<ValidationResult>(() =>
      validateValues(item)
    );
    const { http } = useKibana().services;
    const getSuggestionsFn = useCallback<ValueSuggestionsGetFn>(
      ({ field, query }) => {
        const trustedAppsAPIClient = new TrustedAppsApiClient(http);
        return trustedAppsAPIClient.getSuggestions({ field: field.name, query });
      },
      [http]
    );

    const autocompleteSuggestions = useSuggestions(getSuggestionsFn);
    
    // This value has to be memoized to avoid infinite useEffect loop on useFetchIndex
    const indexNames = useMemo(() => [eventsIndexPattern], []);
    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(
      indexNames,
      undefined,
      ENDPOINT_FIELDS_SEARCH_STRATEGY
    );

    const isFormAdvancedMode: boolean = useMemo(() => isAdvancedModeEnabled(item), [item]);
    const { getTagsUpdatedBy } = useGetUpdatedTags(item);

    const selectedFormType = useMemo(() => {
      return isFormAdvancedMode ? 'advancedMode' : 'basicMode';
    }, [isFormAdvancedMode]);

    const advancedModeToggle = [
      {
        id: 'basicMode',
        label: i18n.translate('xpack.securitySolution.trustedApps.flyoutForm.basicMode', {
          defaultMessage: 'Basic',
        }),
        iconType: selectedFormType === 'basicMode' ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': 'basicModeButton',
      },
      {
        id: 'advancedMode',
        label: i18n.translate('xpack.securitySolution.trustedApps.flyoutForm.advancedMode', {
          defaultMessage: 'Advanced',
        }),
        iconType: selectedFormType === 'advancedMode' ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': 'advancedModeButton',
      },
    ];



    const processChanged = useCallback(
      (updatedFormValues: ArtifactFormComponentProps['item']) => {
        const updatedValidationResult = validateValues(updatedFormValues);
        setValidationResult(updatedValidationResult);
        onChange({
          item: updatedFormValues,
          isValid: updatedValidationResult.isValid,
          confirmModalLabels: updatedValidationResult.extraWarning
            ? CONFIRM_WARNING_MODAL_LABELS(
              i18n.translate('xpack.securitySolution.trustedApps.flyoutForm.confirmModal.name', {
                defaultMessage: 'trusted application',
              })
            )
            : undefined,
        });
      },
      [onChange]
    );

    const handleEffectedPolicyOnChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (updatedItem) => {
        processChanged(updatedItem);
        setHasFormChanged(true);
      },
      [processChanged]
    );

    const handleOnNameOrDescriptionChange = useCallback<
      ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
    >(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextItem = {
          ...item,
          [event.target.name]: event.target.value,
        };

        processChanged(nextItem);
        setHasFormChanged(true);
      },
      [item, processChanged]
    );

    const handleOnNameBlur = useCallback<NonNullable<EuiFieldTextProps['onBlur']>>(
      ({ target: { name } }) => {
        processChanged(item);
        setVisited((prevVisited) => ({ ...prevVisited, [name]: true }));
      },
      [item, processChanged]
    );

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () =>
        [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].map((os) => ({
          value: os,
          inputDisplay: OS_TITLES[os],
        })),
      []
    );

    const handleAdvancedModeChange = useCallback(
      (selectedId: string) => {
        onChange({
          item: {
            ...item,
            tags: getTagsUpdatedBy(
              'advancedMode',
              selectedId === 'advancedMode'
                ? [ADVANCED_MODE_TAG]
                : []
            ),
          },
          isValid: true,
        });
      },
      [getTagsUpdatedBy, item, onChange]
    );

    const handleOnOsChange = useCallback(
      (os: OperatingSystem) => {
        setVisited((prevVisited) => {
          return {
            ...prevVisited,
            os: true,
          };
        });

        const nextItem: ArtifactFormComponentProps['item'] = {
          ...item,
          os_types: [os],
          entries: [] as ArtifactFormComponentProps['item']['entries'],
        };

        switch (os) {
          case OperatingSystem.LINUX:
            nextItem.entries = item.entries.filter((entry) =>
              isSignerFieldExcluded(entry as TrustedAppConditionEntry)
            );
            if (item.entries.length === 0) {
              nextItem.entries.push(defaultConditionEntry());
            }
            break;
          case OperatingSystem.MAC:
            nextItem.entries = item.entries.map((entry) =>
              entry.field === ConditionEntryField.SIGNER
                ? { ...entry, field: ConditionEntryField.SIGNER_MAC }
                : entry
            );
            if (item.entries.length === 0) {
              nextItem.entries.push(defaultConditionEntry());
            }
            break;
          case OperatingSystem.WINDOWS:
            nextItem.entries = item.entries.map((entry) =>
              entry.field === ConditionEntryField.SIGNER_MAC
                ? { ...entry, field: ConditionEntryField.SIGNER }
                : entry
            );
            if (item.entries.length === 0) {
              nextItem.entries.push(defaultConditionEntry());
            }
            break;
          default:
            nextItem.entries.push(...item.entries);
            break;
        }

        processChanged(nextItem);
        setHasFormChanged(true);
      },
      [item, processChanged]
    );

    const handleConditionBuilderOnVisited: LogicalConditionBuilderProps['onVisited'] =
      useCallback(() => {
        setVisited((prevState) => {
          return {
            ...prevState,
            entries: true,
          };
        });
      }, []);

    const handleEntryChange = useCallback<LogicalConditionBuilderProps['onEntryChange']>(
      (newEntry, oldEntry) => {
        const nextItem: ArtifactFormComponentProps['item'] = {
          ...item,
          entries: item.entries.map((e) => {
            if (e === oldEntry) {
              return newEntry;
            }
            return e;
          }),
        };

        processChanged(nextItem);
        setHasFormChanged(true);
      },
      [item, processChanged]
    );

    const handleEntryRemove = useCallback(
      (entry: NewTrustedApp['entries'][0]) => {
        const nextItem: ArtifactFormComponentProps['item'] = {
          ...item,
          entries: item.entries.filter((e) => e !== entry),
        };

        processChanged(nextItem);
        setHasFormChanged(true);
      },
      [item, processChanged]
    );

    const handleAndClick = useCallback(() => {
      const nextItem: ArtifactFormComponentProps['item'] = {
        ...item,
        entries: [],
      };
      const os = ((item.os_types ?? [])[0] as OperatingSystem) ?? OperatingSystem.WINDOWS;
      if (os === OperatingSystem.LINUX) {
        nextItem.entries = [
          ...item.entries.filter((entry) =>
            isSignerFieldExcluded(entry as TrustedAppConditionEntry)
          ),
          defaultConditionEntry(),
        ];
      } else {
        nextItem.entries = [...item.entries, defaultConditionEntry()];
      }
      processChanged(nextItem);
      setHasFormChanged(true);
    }, [item, processChanged]);

    const selectedOs = useMemo((): OperatingSystem => {
      if (!item?.os_types?.length) {
        return OperatingSystem.WINDOWS;
      }
      return item.os_types[0] as OperatingSystem;
    }, [item?.os_types]);

    const trustedApp = useMemo<ArtifactFormComponentProps['item']>(() => {
      const ta = item;

      ta.entries = item.entries.length
        ? (item.entries as TrustedAppConditionEntry[])
        : [defaultConditionEntry()];

      return ta;
    }, [item]);

    return (
      <EuiForm
        component="div"
        data-test-subj={getTestId('')}
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={getTestId('submitError')} />
          ) : undefined
        }
        isInvalid={!!submitError}
      >
        <EuiTitle size="xs">
          <h3>{DETAILS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {mode === 'create' && (
          <EuiText size="s" data-test-subj={getTestId('about')}>
            <p>
              {DETAILS_HEADER_DESCRIPTION}
              {
                <>
                  <EuiSpacer size="m" />
                  <TrustedAppsArtifactsDocsLink />
                </>
              }
            </p>
          </EuiText>
        )}
        <EuiSpacer size="m" />
        <EuiFormRow
          label={NAME_LABEL}
          fullWidth
          data-test-subj={getTestId('nameRow')}
          isInvalid={visited.name && validationResult.result.name?.isInvalid}
          error={validationResult.result.name?.errors}
        >
          <EuiFieldText
            name="name"
            value={item.name}
            onChange={handleOnNameOrDescriptionChange}
            onBlur={handleOnNameBlur}
            fullWidth
            required={visited.name}
            maxLength={256}
            data-test-subj={getTestId('nameTextField')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={DESCRIPTION_LABEL}
          fullWidth
          data-test-subj={getTestId('descriptionRow')}
        >
          <EuiTextArea
            name="description"
            value={item.description}
            onChange={handleOnNameOrDescriptionChange}
            fullWidth
            compressed
            maxLength={256}
            data-test-subj={getTestId('descriptionField')}
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        <EuiText size="xs">
          <h3>{CONDITIONS_HEADER}</h3>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiText size="s">{CONDITIONS_HEADER_DESCRIPTION}</EuiText>
          </EuiFlexItem>
          {isTAAdvancedModeFeatureFlagEnabled && (<EuiFlexItem grow={1}>
            <EuiFormRow fullWidth>
              <EuiButtonGroup
                legend="Advanced Mode Toggle"
                color="primary"
                options={advancedModeToggle}
                idSelected={selectedFormType}
                onChange={handleAdvancedModeChange}
              />
            </EuiFormRow>
          </EuiFlexItem>)}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={SELECT_OS_LABEL}
          fullWidth
          data-test-subj={getTestId('OsRow')}
          isInvalid={visited?.os && validationResult.result.os?.isInvalid}
          error={validationResult.result.os?.errors}
        >
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={selectedOs}
            onChange={handleOnOsChange}
            fullWidth
            data-test-subj={getTestId('osSelectField')}
          />
        </EuiFormRow>
        {isFormAdvancedMode && (<EuiText>hi bubaz</EuiText>)}
        <EuiFormRow
          fullWidth
          data-test-subj={getTestId('conditionsRow')}
          isInvalid={visited.entries && validationResult.result.entries?.isInvalid}
          error={validationResult.result.entries?.errors}
          helpText={validationResult.result.entries?.warnings}
        >
          <LogicalConditionBuilder
            entries={trustedApp.entries as NewTrustedApp['entries']}
            os={selectedOs}
            onAndClicked={handleAndClick}
            onEntryRemove={handleEntryRemove}
            onEntryChange={handleEntryChange}
            onVisited={handleConditionBuilderOnVisited}
            data-test-subj={getTestId('conditionsBuilder')}
          />
        </EuiFormRow>
        {showAssignmentSection ? (
          <>
            <EuiHorizontalRule />
            <EuiFormRow fullWidth data-test-subj={getTestId('policySelection')}>
              <EffectedPolicySelect
                item={item}
                description={POLICY_SELECT_DESCRIPTION}
                data-test-subj={getTestId('effectedPolicies')}
                onChange={handleEffectedPolicyOnChange}
              />
            </EuiFormRow>
          </>
        ) : null}
      </EuiForm>
    );
  }
);

TrustedAppsForm.displayName = 'TrustedAppsForm';