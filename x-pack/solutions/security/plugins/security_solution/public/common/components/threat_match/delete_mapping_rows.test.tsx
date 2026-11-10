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

import { useKibana } from '../../lib/kibana';
import { TestProviders } from '../../mock';
import type { ThreatMapping } from '../../../../common/api/detection_engine/model/rule_schema';
import { ThreatMatchComponent } from '.';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

const dataView = { id: '1234', title: 'logstash-*', fields } as DataViewBase;

const mappingEntry = (field = '', value = '') =>
  addIdToItem({ field, type: 'mapping' as const, value, negate: false });

/** One OR item: its entries are the rows joined by AND. */
const orItem = (...entries: Array<ReturnType<typeof mappingEntry>>) => addIdToItem({ entries });

/** Keeps the mapping in state, as the rule form does, so rows react to deletes. */
const StatefulThreatMatch = ({ initialMapping }: { initialMapping: ThreatMapping }) => {
  const [mapping, setMapping] = useState(initialMapping);

  return (
    <TestProviders>
      <ThreatMatchComponent
        mappingEntries={mapping}
        indexPatterns={dataView}
        threatIndexPatterns={dataView}
        onMappingEntriesChange={setMapping}
      />
    </TestProviders>
  );
};

/** The index field and indicator field combo boxes, in display order: [index1, indicator1, ...]. */
const getFieldInputs = () => screen.getAllByRole('combobox');

const deleteRow = async (row: number) => {
  await userEvent.click(screen.getAllByTestId('itemEntryDeleteButton')[row - 1]);
};

describe('ThreatMatchComponent deleting mapping rows', () => {
  // Typing into the combo boxes is slow on loaded CI shards, where the 5s default timed out.
  jest.setTimeout(30_000);

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        unifiedSearch: {
          autocomplete: { getValueSuggestions: jest.fn().mockResolvedValue([]) },
        },
      },
    });
  });

  it('shifts the second of two valid rows up when the first row is deleted', async () => {
    render(
      <StatefulThreatMatch
        initialMapping={[orItem(mappingEntry('host.name', 'ip'), mappingEntry('machine.os', 'ip'))]}
      />
    );

    await deleteRow(1);

    const inputs = getFieldInputs();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('machine.os');
    expect(inputs[1]).toHaveValue('ip');
  });

  it('keeps the second row, with its invalid indicator field, when the first row is deleted', async () => {
    render(
      <StatefulThreatMatch
        initialMapping={[orItem(mappingEntry('host.name'), mappingEntry('host.name'))]}
      />
    );
    const [, firstIndicator, , secondIndicator] = getFieldInputs();
    await userEvent.type(firstIndicator, 'bad-one');
    await userEvent.type(secondIndicator, 'bad-two');

    await deleteRow(1);

    const inputs = getFieldInputs();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('host.name');
    expect(inputs[1]).toHaveValue('bad-two');
  });

  it('keeps the second row, with its invalid index field, when the first row is deleted', async () => {
    render(
      <StatefulThreatMatch
        initialMapping={[orItem(mappingEntry('', 'ip'), mappingEntry('', 'ip'))]}
      />
    );
    const [firstIndex, , secondIndex] = getFieldInputs();
    await userEvent.type(firstIndex, 'bad-one');
    await userEvent.type(secondIndex, 'bad-two');

    await deleteRow(1);

    const inputs = getFieldInputs();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('bad-two');
    expect(inputs[1]).toHaveValue('ip');
  });

  it('shifts the third row up when the second of three rows is deleted', async () => {
    render(
      <StatefulThreatMatch
        initialMapping={[
          orItem(
            mappingEntry('host.name', 'ip'),
            mappingEntry('', ''),
            mappingEntry('host.name', 'ip')
          ),
        ]}
      />
    );
    const [, , secondIndex, secondIndicator] = getFieldInputs();
    await userEvent.type(secondIndex, 'bad-one');
    await userEvent.type(secondIndicator, 'bad-one');

    await deleteRow(2);

    const inputs = getFieldInputs();
    expect(inputs).toHaveLength(4);
    expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual([
      'host.name',
      'ip',
      'host.name',
      'ip',
    ]);
  });

  it('shifts the second OR row up when the first, invalid, OR row is deleted', async () => {
    render(
      <StatefulThreatMatch
        initialMapping={[orItem(mappingEntry('', '')), orItem(mappingEntry('host.name', 'ip'))]}
      />
    );
    const [firstIndex, firstIndicator] = getFieldInputs();
    await userEvent.type(firstIndex, 'bad-one');
    await userEvent.type(firstIndicator, 'bad-two');

    await deleteRow(1);

    const inputs = getFieldInputs();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('host.name');
    expect(inputs[1]).toHaveValue('ip');
  });
});
