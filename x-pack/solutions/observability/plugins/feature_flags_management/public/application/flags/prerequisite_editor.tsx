/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LIMITS, type Flag, type VariationValue } from '../../../common';
import { useAppServices } from '../app_services';
import { useAsyncData, useDebouncedValue } from '../use_async_data';
import type { PrerequisiteDraft } from './flag_form';
import { VariationSelect } from './variation_fields';

export const PrerequisiteEditor = ({
  environment,
  currentFlagKey,
  prerequisites,
  readOnly,
  onChange,
}: {
  environment: string;
  currentFlagKey: string;
  prerequisites: readonly PrerequisiteDraft[];
  readOnly: boolean;
  onChange: (prerequisites: PrerequisiteDraft[]) => void;
}) => {
  const { api } = useAppServices();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 250);
  const [knownFlags, setKnownFlags] = useState<Record<string, Flag>>({});
  const load = useCallback(
    () =>
      api.listFlags({
        environment,
        search: debouncedSearch || undefined,
        page: 1,
        perPage: 20,
      }),
    [api, environment, debouncedSearch]
  );
  const { data, loading } = useAsyncData(load);

  useEffect(() => {
    if (!data) {
      return;
    }
    setKnownFlags((current) => {
      const next = { ...current };
      for (const flag of data.items) {
        next[flag.key] = flag;
      }
      return next;
    });
  }, [data]);

  useEffect(() => {
    const missing = prerequisites
      .map((item) => item.flag)
      .filter((flag) => flag && !knownFlags[flag] && flag !== currentFlagKey);
    if (missing.length === 0) {
      return;
    }
    let active = true;
    for (const flag of missing) {
      void api.getFlag(flag).then(
        (loaded) => {
          if (active) {
            setKnownFlags((current) => ({ ...current, [loaded.key]: loaded }));
          }
        },
        () => undefined
      );
    }
    return () => {
      active = false;
    };
  }, [api, currentFlagKey, knownFlags, prerequisites]);

  const options = (data?.items ?? [])
    .filter((flag) => flag.key !== currentFlagKey)
    .filter((flag) => !prerequisites.some((item) => item.flag === flag.key))
    .map((flag) => ({ label: flag.key, value: flag.key }));

  const update = (index: number, next: PrerequisiteDraft) => {
    const copy = prerequisites.map((item, itemIndex) => (itemIndex === index ? next : item));
    onChange(copy);
  };

  return (
    <>
      <EuiText size="s">
        <h4>
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.editor.prerequisitesTitle"
            defaultMessage="Prerequisites"
          />
        </h4>
      </EuiText>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.editor.prerequisitesDescription"
            defaultMessage="This flag is served only when each prerequisite flag serves the chosen variation in this environment."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {prerequisites.map((prerequisite, index) => {
        const known = prerequisite.flag ? knownFlags[prerequisite.flag] : undefined;
        const variations =
          known?.variations ?? (prerequisite.value !== undefined ? [prerequisite.value] : []);
        return (
          <React.Fragment key={`${prerequisite.flag}-${index}`}>
            {index > 0 && <EuiSpacer size="s" />}
            <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.featureFlagsManagement.flags.editor.prerequisiteFlagLabel"
                      defaultMessage="Flag"
                    />
                  }
                >
                  <EuiComboBox
                    aria-label={i18n.translate(
                      'xpack.featureFlagsManagement.flags.editor.prerequisiteFlagAriaLabel',
                      { defaultMessage: 'Prerequisite flag' }
                    )}
                    placeholder={i18n.translate(
                      'xpack.featureFlagsManagement.flags.editor.prerequisiteFlagPlaceholder',
                      { defaultMessage: 'Select a flag' }
                    )}
                    fullWidth
                    async
                    isLoading={loading}
                    isDisabled={readOnly}
                    singleSelection={{ asPlainText: true }}
                    options={options}
                    selectedOptions={prerequisite.flag ? [{ label: prerequisite.flag }] : []}
                    onSearchChange={setSearchValue}
                    onChange={(selected) => {
                      const flagKey = selected[0]?.value;
                      if (typeof flagKey !== 'string') {
                        update(index, { flag: '' });
                        return;
                      }
                      const flag =
                        knownFlags[flagKey] ?? data?.items.find((item) => item.key === flagKey);
                      update(index, { flag: flagKey, value: flag?.variations[0] });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.featureFlagsManagement.flags.editor.prerequisiteValueLabel"
                      defaultMessage="Must serve"
                    />
                  }
                  helpText={
                    known && !known.environments[environment] ? (
                      <FormattedMessage
                        id="xpack.featureFlagsManagement.flags.editor.prerequisiteEnvironmentHelp"
                        defaultMessage="This flag has no rules for {environment}."
                        values={{ environment }}
                      />
                    ) : undefined
                  }
                >
                  <VariationSelect
                    variations={variations}
                    value={prerequisite.value ?? variations[0] ?? ''}
                    disabled={readOnly || variations.length === 0}
                    ariaLabel={i18n.translate(
                      'xpack.featureFlagsManagement.flags.editor.prerequisiteValueAriaLabel',
                      { defaultMessage: 'Variation the prerequisite must serve' }
                    )}
                    onChange={(value: VariationValue) => update(index, { ...prerequisite, value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {!readOnly && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-ebt-action="deleteFlag"
                    data-ebt-element="featureFlagsManagement"
                    data-test-subj="featureFlagsManagementPrerequisiteEditorRemoveButton"
                    color="danger"
                    iconType="trash"
                    aria-label={i18n.translate(
                      'xpack.featureFlagsManagement.flags.editor.removePrerequisiteAriaLabel',
                      {
                        defaultMessage: 'Remove prerequisite {number}',
                        values: { number: index + 1 },
                      }
                    )}
                    onClick={() =>
                      onChange(prerequisites.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <FormattedMessage
                      id="xpack.featureFlagsManagement.flags.editor.removePrerequisiteButtonLabel"
                      defaultMessage="Remove"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </React.Fragment>
        );
      })}
      {!readOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            data-ebt-action="confirm"
            data-ebt-element="featureFlagsManagement"
            data-test-subj="featureFlagsManagementPrerequisiteEditorAddPrerequisiteButton"
            size="s"
            iconType="plus"
            disabled={prerequisites.length >= LIMITS.maxPrerequisites}
            onClick={() => onChange([...prerequisites, { flag: '' }])}
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.addPrerequisiteButtonLabel"
              defaultMessage="Add prerequisite"
            />
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
