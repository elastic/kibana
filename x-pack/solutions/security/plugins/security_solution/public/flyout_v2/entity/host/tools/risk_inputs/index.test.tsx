/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RiskInputs } from '.';
import { RISK_INPUTS_TOOL_TEST_ID } from './test_ids';

jest.mock('../../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({
    title,
    label,
    iconType,
    onTitleClick,
  }: {
    title: string;
    label?: string;
    iconType?: string;
    onTitleClick?: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="mockToolsFlyoutHeader"
      data-title={title}
      data-label={label}
      data-icon-type={iconType}
      onClick={onTitleClick}
    />
  ),
}));

jest.mock('../../../../../entity_analytics/components/flyout_v2/risk_inputs_tab', () => ({
  RiskInputsTab: ({
    entityType,
    entityName,
    scopeId,
    entityId,
  }: {
    entityType: string;
    entityName: string;
    scopeId: string;
    entityId?: string;
  }) => (
    <div
      data-test-subj="mockRiskInputsTab"
      data-entity-type={entityType}
      data-entity-name={entityName}
      data-scope-id={scopeId}
      data-entity-id={entityId ?? ''}
    />
  ),
}));

describe('<RiskInputs />', () => {
  it('renders the header with the "Risk score" title and host label', () => {
    const { getByTestId } = render(<RiskInputs entityName="my-host" scopeId="scope" />);
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-title', 'Risk score');
    expect(header).toHaveAttribute('data-label', 'my-host');
    expect(header).toHaveAttribute('data-icon-type', 'storage');
  });

  it('renders the risk inputs body container', () => {
    const { getByTestId } = render(<RiskInputs entityName="my-host" scopeId="scope" />);
    expect(getByTestId(RISK_INPUTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes entity context to the underlying RiskInputsTab', () => {
    const { getByTestId } = render(
      <RiskInputs entityName="my-host" scopeId="my-scope" entityId="euid-123" />
    );
    const tab = getByTestId('mockRiskInputsTab');
    expect(tab).toHaveAttribute('data-entity-type', 'host');
    expect(tab).toHaveAttribute('data-entity-name', 'my-host');
    expect(tab).toHaveAttribute('data-scope-id', 'my-scope');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-123');
  });

  it('forwards onOpenHost to the header click handler', () => {
    const onOpenHost = jest.fn();
    const { getByTestId } = render(
      <RiskInputs entityName="my-host" scopeId="scope" onOpenHost={onOpenHost} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onOpenHost).toHaveBeenCalledTimes(1);
  });
});
