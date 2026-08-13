/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  buildFlyoutContent,
  buildFlyoutTitleFromField,
  buildFlyoutDescriptorFromField,
} from './build_flyout_content';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import {
  SIGNAL_RULE_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { FLYOUT_DESCRIPTOR_KIND } from '../url_state/flyout_v2_url_param';

jest.mock('../components/table_field_name_cell', () => ({
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

jest.mock('../../entity/host/main', () => ({
  Host: ({ hostName, hit }: { hostName: string; hit?: { flattened: Record<string, unknown> } }) => (
    <div data-test-subj="mockHost" data-has-hit={hit ? 'true' : 'false'}>
      {hostName}
    </div>
  ),
}));

jest.mock('../../entity/user/main', () => ({
  User: ({ userName, hit }: { userName: string; hit?: { flattened: Record<string, unknown> } }) => (
    <div data-test-subj="mockUser" data-has-hit={hit ? 'true' : 'false'}>
      {userName}
    </div>
  ),
}));

jest.mock(
  '../../../one_discover/alert_flyout_overview_tab_component/data_view_manager_bootstrap',
  () => ({
    DataViewManagerBootstrap: () => null,
  })
);

describe('buildFlyoutContent', () => {
  it('should return a Network element for a source IP field', async () => {
    const result = buildFlyoutContent('source.ip', '10.0.0.1');

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockNetwork')).toHaveTextContent(
      `10.0.0.1-${FlowTargetSourceDest.source}`
    );
  });

  it('should return a Network element for a destination IP field', async () => {
    const result = buildFlyoutContent('destination.ip', '192.168.1.1');

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockNetwork')).toHaveTextContent(
      `192.168.1.1-${FlowTargetSourceDest.destination}`
    );
  });

  it('should return a Host element for a host.name field', async () => {
    const result = buildFlyoutContent('host.name', 'my-host');

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockHost')).toHaveTextContent('my-host');
  });

  it('should pass hit to Host element when provided', async () => {
    const mockHit = {
      id: 'test-doc-id',
      raw: { _id: 'test-doc-id', _index: 'test-index' },
      flattened: { 'host.name': 'my-host' },
    } as unknown as Parameters<typeof buildFlyoutContent>[2];

    const result = buildFlyoutContent('host.name', 'my-host', mockHit);

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockHost')).toHaveAttribute('data-has-hit', 'true');
  });

  it('should return a User element for a user.name field', async () => {
    const result = buildFlyoutContent(USER_NAME_FIELD_NAME, 'my-user');

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockUser')).toHaveTextContent('my-user');
  });

  it('should pass hit to User element when provided', async () => {
    const mockHit = {
      id: 'test-doc-id',
      raw: { _id: 'test-doc-id', _index: 'test-index' },
      flattened: { 'user.name': 'my-user' },
    } as unknown as Parameters<typeof buildFlyoutContent>[2];

    const result = buildFlyoutContent(USER_NAME_FIELD_NAME, 'my-user', mockHit);

    expect(result).not.toBeNull();

    const { findByTestId } = render(result!);
    expect(await findByTestId('mockUser')).toHaveAttribute('data-has-hit', 'true');
  });

  it('should return null for an unknown field', () => {
    const result = buildFlyoutContent('unknown.field', 'value');

    expect(result).toBeNull();
  });
});

describe('buildFlyoutTitleFromField', () => {
  it('should return a Network title for an IP field', () => {
    expect(buildFlyoutTitleFromField('source.ip', '10.0.0.1')).toBe('Network: 10.0.0.1');
  });

  it('should return a Rule title for a signal rule name field', () => {
    expect(buildFlyoutTitleFromField(SIGNAL_RULE_NAME_FIELD_NAME, 'My Rule')).toBe('Rule: My Rule');
  });

  it('should return a Host title for a host.name field', () => {
    expect(buildFlyoutTitleFromField('host.name', 'my-host')).toBe('Host: my-host');
  });

  it('should return a User title for a user.name field', () => {
    expect(buildFlyoutTitleFromField(USER_NAME_FIELD_NAME, 'my-user')).toBe('User: my-user');
  });

  it('should return null for an unknown field', () => {
    expect(buildFlyoutTitleFromField('unknown.field', 'value')).toBeNull();
  });
});

describe('buildFlyoutDescriptorFromField', () => {
  it('returns a network descriptor for a source IP field', () => {
    expect(buildFlyoutDescriptorFromField('source.ip', '10.0.0.1')).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.network,
      ip: '10.0.0.1',
      flowTarget: FlowTargetSourceDest.source,
    });
  });

  it('returns a network descriptor with destination flowTarget for a destination IP field', () => {
    expect(buildFlyoutDescriptorFromField('destination.ip', '192.168.1.1')).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.network,
      ip: '192.168.1.1',
      flowTarget: FlowTargetSourceDest.destination,
    });
  });

  it('returns a rule descriptor for the signal rule name field', () => {
    expect(buildFlyoutDescriptorFromField(SIGNAL_RULE_NAME_FIELD_NAME, 'rule-uuid')).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.rule,
      ruleId: 'rule-uuid',
    });
  });

  it('returns a host descriptor for a host.name field', () => {
    expect(buildFlyoutDescriptorFromField('host.name', 'my-host')).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.host,
      hostName: 'my-host',
    });
  });

  it('returns a user descriptor for a user.name field', () => {
    expect(buildFlyoutDescriptorFromField(USER_NAME_FIELD_NAME, 'my-user')).toEqual({
      kind: FLYOUT_DESCRIPTOR_KIND.user,
      userName: 'my-user',
    });
  });

  it('returns null for an unsupported field', () => {
    expect(buildFlyoutDescriptorFromField('unknown.field', 'value')).toBeNull();
  });
});
