/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataViewBase } from '@kbn/es-query';
import { fields } from '@kbn/data-plugin/common/mocks';
import { addIdToItem } from '@kbn/securitysolution-utils';

import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import type { ThreatMapping } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { FieldHook } from '../../../../shared_imports';
import { ThreatMatchMappingField } from './threat_match_mapping_field';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

const dataView = { id: '1234', title: 'logstash-*', fields } as DataViewBase;

const initialMapping: ThreatMapping = [
  addIdToItem({
    entries: [addIdToItem({ field: 'host.name', type: 'mapping' as const, value: 'ip' })],
  }),
];

/** A minimal form field that keeps its value in state, like the rule form does. */
const FieldWithState = () => {
  const [value, setValue] = useState(initialMapping);
  const field = {
    value,
    setValue,
    validate: jest.fn(),
    errors: [],
    label: '',
  } as unknown as FieldHook<ThreatMapping>;

  return (
    <TestProviders>
      <ThreatMatchMappingField
        field={field}
        indexPatterns={dataView}
        threatIndexPatterns={dataView}
      />
    </TestProviders>
  );
};

describe('ThreatMatchMappingField', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        unifiedSearch: {
          autocomplete: { getValueSuggestions: jest.fn().mockResolvedValue([]) },
        },
      },
    });
  });

  it('restores an empty row with the Search placeholder when the only row is deleted', async () => {
    render(<FieldWithState />);

    await userEvent.click(screen.getByTestId('itemEntryDeleteButton'));

    const inputs = screen.getAllByRole('combobox');
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => {
      expect(input).toHaveValue('');
      expect(input).toHaveAttribute('placeholder', 'Search');
    });
  });
});
