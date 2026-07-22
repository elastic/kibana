/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { AnomalyInsights } from '.';
import { ANOMALY_INSIGHTS_TOOL_TEST_ID } from './test_ids';

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

jest.mock('../../../../../entity_analytics/components/anomalies/anomalies_tab', () => ({
  AnomaliesTab: ({ entityId, entityType }: { entityId: string; entityType: string }) => (
    <div
      data-test-subj="mockAnomaliesTab"
      data-entity-id={entityId}
      data-entity-type={entityType}
    />
  ),
}));

describe('<AnomalyInsights /> host', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with the title, host label and storage icon', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.host} value="my-host" />
    );
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-title', 'Behavioral anomalies');
    expect(header).toHaveAttribute('data-label', 'my-host');
    expect(header).toHaveAttribute('data-icon-type', 'storage');
  });

  it('renders the anomalies tab inside a scrollable flyout body', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.host} value="my-host" />
    );
    const body = getByTestId(ANOMALY_INSIGHTS_TOOL_TEST_ID);
    expect(body).toBeInTheDocument();
    expect(body).toContainElement(getByTestId('mockAnomaliesTab'));
  });

  it('forwards the entity id and entity type to the anomalies tab', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.host} value="my-host" entityId="euid-123" />
    );
    const tab = getByTestId('mockAnomaliesTab');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-123');
    expect(tab).toHaveAttribute('data-entity-type', 'host');
  });

  it('passes an empty entity id to the tab when none is provided', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.host} value="my-host" />
    );
    expect(getByTestId('mockAnomaliesTab')).toHaveAttribute('data-entity-id', '');
  });

  it('forwards onOpenEntity to the header click handler', () => {
    const onOpenEntity = jest.fn();
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.host} value="my-host" onOpenEntity={onOpenEntity} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onOpenEntity).toHaveBeenCalledTimes(1);
  });
});

describe('<AnomalyInsights /> user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with the user label and user icon', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.user} value="my-user" />
    );
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-label', 'my-user');
    expect(header).toHaveAttribute('data-icon-type', 'user');
  });

  it('forwards the user entity type to the anomalies tab', () => {
    const { getByTestId } = render(
      <AnomalyInsights entityType={EntityType.user} value="my-user" entityId="euid-456" />
    );
    const tab = getByTestId('mockAnomaliesTab');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-456');
    expect(tab).toHaveAttribute('data-entity-type', 'user');
  });
});
