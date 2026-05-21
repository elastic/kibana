/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildFlyoutContent } from './build_flyout_content';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';

jest.mock('../../../flyout/document_details/right/components/table_field_name_cell', () => ({
  getEcsField: (field: string) => {
    const ecsMap: Record<string, { type: string }> = {
      'source.ip': { type: 'ip' },
      'destination.ip': { type: 'ip' },
      'host.name': { type: 'keyword' },
    };
    return ecsMap[field];
  },
}));

jest.mock('../../network/main', () => ({
  Network: ({ ip, flowTarget }: { ip: string; flowTarget: string }) => (
    <div data-test-subj="mockNetwork">{`${ip}-${flowTarget}`}</div>
  ),
}));

jest.mock(
  '../../../one_discover/alert_flyout_overview_tab_component/data_view_manager_bootstrap',
  () => ({
    DataViewManagerBootstrap: () => null,
  })
);

describe('buildFlyoutContent', () => {
  it('should return a Network element for a source IP field', () => {
    const result = buildFlyoutContent('source.ip', '10.0.0.1');

    expect(result).not.toBeNull();

    const { getByTestId } = render(result!);
    expect(getByTestId('mockNetwork')).toHaveTextContent(`10.0.0.1-${FlowTargetSourceDest.source}`);
  });

  it('should return a Network element for a destination IP field', () => {
    const result = buildFlyoutContent('destination.ip', '192.168.1.1');

    expect(result).not.toBeNull();

    const { getByTestId } = render(result!);
    expect(getByTestId('mockNetwork')).toHaveTextContent(
      `192.168.1.1-${FlowTargetSourceDest.destination}`
    );
  });

  it('should return null for a non-IP field', () => {
    const result = buildFlyoutContent('host.name', 'my-host');

    expect(result).toBeNull();
  });

  it('should return null for an unknown field', () => {
    const result = buildFlyoutContent('unknown.field', 'value');

    expect(result).toBeNull();
  });
});
