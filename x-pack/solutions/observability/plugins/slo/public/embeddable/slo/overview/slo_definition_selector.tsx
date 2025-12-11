/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import type { SLODefinitionResponse } from '@kbn/slo-schema';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';

interface Props {
  initialSloId?: string;
  onSelected: (slo: SLODefinitionResponse | undefined) => void;
  hasError?: boolean;
}

const SLO_REQUIRED = i18n.translate('xpack.slo.sloEmbeddable.config.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

export function SloDefinitionSelector({ initialSloId, onSelected, hasError }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const search = searchValue.trim();

  const { isLoading, data: definitionsData } = useFetchSloDefinitions({
    name: search,
    perPage: 100,
  });

  const options = useMemo(() => {
    return (
      definitionsData?.results.map((slo) => ({
        label: slo.name,
        value: slo.id,
      })) ?? []
    );
  }, [definitionsData]);

  // Set initial selection if initialSloId is provided
  useEffect(() => {
    if (initialSloId && definitionsData?.results) {
      const initialSlo = definitionsData.results.find((slo) => slo.id === initialSloId);
      if (initialSlo) {
        setSelectedOptions([
          {
            label: initialSlo.name,
            value: initialSlo.id,
          },
        ]);
        onSelected(initialSlo);
      }
    }
  }, [initialSloId, definitionsData, onSelected]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    if (opts.length === 0) {
      onSelected(undefined);
      return;
    }

    const selectedSloId = opts[0].value!;
    const selectedSlo = definitionsData?.results.find((slo) => slo.id === selectedSloId);
    onSelected(selectedSlo);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

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
        aria-label={i18n.translate('xpack.slo.sloEmbeddable.config.sloDefinitionSelector.ariaLabel', {
          defaultMessage: 'SLO Definition',
        })}
        placeholder={i18n.translate('xpack.slo.sloEmbeddable.config.sloDefinitionSelector.placeholder', {
          defaultMessage: 'Select a SLO definition',
        })}
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

