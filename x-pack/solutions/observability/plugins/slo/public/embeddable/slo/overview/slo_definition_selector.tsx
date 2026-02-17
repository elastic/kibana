/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import type { SearchSLODefinitionItem } from '@kbn/slo-schema';
import { useFetchSloDefinitionsWithRemote } from '../../../hooks/use_fetch_slo_definitions_with_remote';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';

interface Props {
  onSelected: (slo: SearchSLODefinitionItem | undefined) => void;
  hasError?: boolean;
  remoteName?: string;
  initialSloId?: string;
  initialRemoteName?: string;
}

const SLO_REQUIRED = i18n.translate('xpack.slo.sloEmbeddable.config.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

function sloDetailsToDefinitionItem(details: {
  id: string;
  name: string;
  groupBy?: string | string[];
  remote?: { remoteName: string; kibanaUrl: string };
}): SearchSLODefinitionItem {
  const groupBy = details.groupBy ?? [];
  return {
    id: details.id,
    name: details.name,
    groupBy: Array.isArray(groupBy) ? groupBy : [groupBy],
    ...(details.remote && { remote: details.remote }),
  };
}

export function SloDefinitionSelector({
  onSelected,
  hasError,
  remoteName,
  initialSloId,
  initialRemoteName,
}: Props) {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const search = searchValue.trim();
  const initialSelectionApplied = useRef(false);

  const effectiveRemoteName = initialRemoteName ?? remoteName;

  const { data: initialSloDetails } = useFetchSloDetails({
    sloId: initialSloId,
    remoteName: effectiveRemoteName,
    shouldRefetch: false,
  });

  const { isLoading, data: definitionsData } = useFetchSloDefinitionsWithRemote({
    search,
    size: 100,
    remoteName: effectiveRemoteName,
  });

  const options = useMemo(() => {
    const fromDefinitions =
      definitionsData?.results.map((slo) => ({
        label: slo.name,
        value: slo.id,
      })) ?? [];
    if (initialSloDetails && initialSloId) {
      const alreadyInList = fromDefinitions.some((opt) => opt.value === initialSloDetails.id);
      if (!alreadyInList) {
        return [
          { label: initialSloDetails.name, value: initialSloDetails.id },
          ...fromDefinitions,
        ];
      }
    }
    return fromDefinitions;
  }, [definitionsData, initialSloDetails, initialSloId]);

  useEffect(() => {
    if (
      initialSloId &&
      initialSloDetails &&
      !initialSelectionApplied.current
    ) {
      initialSelectionApplied.current = true;
      const definitionItem = sloDetailsToDefinitionItem(initialSloDetails);
      setSelectedOptions([{ label: initialSloDetails.name, value: initialSloDetails.id }]);
      onSelected(definitionItem);
    }
  }, [initialSloId, initialSloDetails, onSelected]);

  const getDefinitionItemById = (id: string): SearchSLODefinitionItem | undefined => {
    const fromDefinitions = definitionsData?.results.find((slo) => slo.id === id);
    if (fromDefinitions) return fromDefinitions;
    if (initialSloDetails?.id === id) {
      return sloDetailsToDefinitionItem(initialSloDetails);
    }
    return undefined;
  };

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    if (opts.length === 0) {
      onSelected(undefined);
      return;
    }

    const selectedSloId = opts[0].value!;
    const selectedSlo = getDefinitionItemById(selectedSloId);
    onSelected(selectedSlo);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      onSearchChange.cancel();
    };
  }, [onSearchChange]);

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={hasError ? SLO_REQUIRED : undefined}
      label={i18n.translate('xpack.slo.embeddable.sloDefinitionSelectorLabel', {
        defaultMessage: 'SLO Definition',
      })}
    >
      <EuiComboBox
        aria-label={i18n.translate(
          'xpack.slo.sloEmbeddable.config.sloDefinitionSelector.ariaLabel',
          {
            defaultMessage: 'SLO Definition',
          }
        )}
        placeholder={i18n.translate(
          'xpack.slo.sloEmbeddable.config.sloDefinitionSelector.placeholder',
          {
            defaultMessage: 'Select a SLO definition',
          }
        )}
        data-test-subj="sloDefinitionSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection={{ asPlainText: true }}
      />
    </EuiFormRow>
  );
}
