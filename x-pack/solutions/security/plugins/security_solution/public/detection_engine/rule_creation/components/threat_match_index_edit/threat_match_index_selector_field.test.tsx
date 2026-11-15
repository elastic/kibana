/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldHook } from '../../../../shared_imports';
import { ThreatMatchIndexSelectorField } from './threat_match_index_selector_field';
import { RESET_TO_DEFAULT_THREAT_MATCH_INDEX } from './translations';

const mockUseDefaultThreatIndices = jest.fn();
jest.mock('../../../../common/hooks/use_curated_indicator_alias', () => ({
  useDefaultThreatIndices: () => mockUseDefaultThreatIndices(),
}));
jest.mock('@kbn/es-ui-shared-plugin/static/forms/components', () => ({
  ComboBoxField: ({ labelAppend }: { labelAppend?: React.ReactNode }) => <div>{labelAppend}</div>,
}));

const ALIAS = '.threat-intel-indicators-default';

const renderField = (value: string[]) => {
  const setValue = jest.fn();
  render(
    <ThreatMatchIndexSelectorField field={{ value, setValue } as unknown as FieldHook<string[]>} />
  );
  return { setValue };
};

describe('ThreatMatchIndexSelectorField', () => {
  it('resets to the configured threat indices plus the curated alias when there is one', async () => {
    mockUseDefaultThreatIndices.mockReturnValue({ threatIndices: ['logs-ti_*', ALIAS] });
    const { setValue } = renderField(['logs-ti_*']);

    await userEvent.click(screen.getByText(RESET_TO_DEFAULT_THREAT_MATCH_INDEX));

    expect(setValue).toHaveBeenCalledWith(['logs-ti_*', ALIAS]);
  });

  it('shows no reset when the field already holds the default, alias included', () => {
    mockUseDefaultThreatIndices.mockReturnValue({ threatIndices: ['logs-ti_*', ALIAS] });
    renderField(['logs-ti_*', ALIAS]);

    expect(screen.queryByText(RESET_TO_DEFAULT_THREAT_MATCH_INDEX)).not.toBeInTheDocument();
  });

  it('resets to the configured threat indices alone when there is no alias', async () => {
    mockUseDefaultThreatIndices.mockReturnValue({ threatIndices: ['logs-ti_*'] });
    const { setValue } = renderField(['custom-*']);

    await userEvent.click(screen.getByText(RESET_TO_DEFAULT_THREAT_MATCH_INDEX));

    expect(setValue).toHaveBeenCalledWith(['logs-ti_*']);
  });
});
