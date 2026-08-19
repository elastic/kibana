/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { ObservableEntitiesList } from './observable_entities_list';
import {
  ATTACK_ENTITIES_TOOL_OBSERVABLES_TEST_ID,
  ATTACK_ENTITIES_TOOL_OBSERVABLE_ROW_TEST_ID,
} from '../test_ids';

const renderIpLink = (ip: string) => <span data-test-subj="mock-ip-link">{ip}</span>;

const renderList = (props: Partial<React.ComponentProps<typeof ObservableEntitiesList>> = {}) =>
  render(
    <TestProviders>
      <ObservableEntitiesList observableEntities={[]} renderIpLink={renderIpLink} {...props} />
    </TestProviders>
  );

describe('ObservableEntitiesList', () => {
  it('renders nothing when there are no observables', () => {
    renderList();

    expect(screen.queryByTestId(ATTACK_ENTITIES_TOOL_OBSERVABLES_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders one row per observable with a human-readable type label', () => {
    renderList({
      observableEntities: [
        { typeKey: 'observable-type-file-hash', value: 'abc123' },
        { typeKey: 'observable-type-user-name', value: 'jdoe' },
      ],
    });

    expect(screen.getByTestId(ATTACK_ENTITIES_TOOL_OBSERVABLES_TEST_ID)).toBeInTheDocument();
    expect(screen.getAllByTestId(ATTACK_ENTITIES_TOOL_OBSERVABLE_ROW_TEST_ID)).toHaveLength(2);
    expect(screen.getByText('File hash')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('User name')).toBeInTheDocument();
    expect(screen.getByText('jdoe')).toBeInTheDocument();
  });

  it('wraps IPv4 and IPv6 values in the IP link renderer', () => {
    renderList({
      observableEntities: [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.1' },
        { typeKey: 'observable-type-ipv6', value: '::1' },
        { typeKey: 'observable-type-domain', value: 'evil.example.com' },
      ],
    });

    const ipLinks = screen.getAllByTestId('mock-ip-link');
    expect(ipLinks).toHaveLength(2);
    expect(ipLinks[0]).toHaveTextContent('10.0.0.1');
    expect(ipLinks[1]).toHaveTextContent('::1');
    // Non-IP values render as plain text, not through the IP renderer.
    expect(screen.getByText('evil.example.com')).toBeInTheDocument();
  });

  it('falls back to the raw type key for unknown observable types', () => {
    renderList({
      observableEntities: [{ typeKey: 'observable-type-something-new', value: 'x' }],
    });

    expect(screen.getByText('observable-type-something-new')).toBeInTheDocument();
  });
});
