/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityType } from '../../../../../../common/entity_analytics/types';
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

jest.mock(
  '../../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab',
  () => ({
    RiskInputsTab: ({
      entityType,
      entityName,
      scopeId,
      entityId,
      isInV2Flyout,
    }: {
      entityType: string;
      entityName: string;
      scopeId: string;
      entityId?: string;
      isInV2Flyout?: boolean;
    }) => (
      <div
        data-test-subj="mockRiskInputsTab"
        data-entity-type={entityType}
        data-entity-name={entityName}
        data-scope-id={scopeId}
        data-entity-id={entityId ?? ''}
        data-is-in-v2-flyout={String(!!isInV2Flyout)}
      />
    ),
  })
);

describe('<RiskInputs /> host', () => {
  it('renders with storage icon and host entity type', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" scopeId="scope" />
    );
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-title', 'Risk score');
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-label', 'my-host');
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-icon-type', 'storage');
  });

  it('renders the host risk inputs body container', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" scopeId="scope" />
    );
    expect(getByTestId(RISK_INPUTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes host entity context to RiskInputsTab', () => {
    const { getByTestId } = render(
      <RiskInputs
        entityType={EntityType.host}
        entityName="my-host"
        scopeId="my-scope"
        entityId="euid-123"
      />
    );
    const tab = getByTestId('mockRiskInputsTab');
    expect(tab).toHaveAttribute('data-entity-type', 'host');
    expect(tab).toHaveAttribute('data-entity-name', 'my-host');
    expect(tab).toHaveAttribute('data-scope-id', 'my-scope');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-123');
    expect(tab).toHaveAttribute('data-is-in-v2-flyout', 'true');
  });

  it('forwards onOpen to the header click handler for host', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      <RiskInputs
        entityType={EntityType.host}
        entityName="my-host"
        scopeId="scope"
        onOpen={onOpen}
      />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('<RiskInputs /> user', () => {
  it('renders with user icon and user entity type', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" scopeId="scope" />
    );
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-icon-type', 'user');
  });

  it('renders the user risk inputs body container', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" scopeId="scope" />
    );
    expect(getByTestId(RISK_INPUTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes user entity context to RiskInputsTab', () => {
    const { getByTestId } = render(
      <RiskInputs
        entityType={EntityType.user}
        entityName="my-user"
        scopeId="my-scope"
        entityId="euid-456"
      />
    );
    const tab = getByTestId('mockRiskInputsTab');
    expect(tab).toHaveAttribute('data-entity-type', 'user');
    expect(tab).toHaveAttribute('data-entity-name', 'my-user');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-456');
  });

  it('forwards onOpen to the header click handler for user', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      <RiskInputs
        entityType={EntityType.user}
        entityName="my-user"
        scopeId="scope"
        onOpen={onOpen}
      />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
