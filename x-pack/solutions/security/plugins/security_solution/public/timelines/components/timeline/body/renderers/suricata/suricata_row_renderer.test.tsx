/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { act, render, screen } from '@testing-library/react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData } from '../../../../../../common/mock';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { suricataRowRenderer } from './suricata_row_renderer';
import { TimelineId } from '../../../../../../../common/types/timeline';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('../../../../../../common/components/link_to');

describe('suricata_row_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].ecs);
    suricata = cloneDeep(mockTimelineData[2].ecs);
  });

  test('renders correctly against snapshot', async () => {
    const children = suricataRowRenderer.renderRow({
      data: nonSuricata,
      scopeId: TimelineId.test,
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(nonSuricata)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(suricata)).toBe(true);
  });

  test('should render a suricata row', async () => {
    const children = suricataRowRenderer.renderRow({
      data: suricata,
      scopeId: TimelineId.test,
    });

    // SuricataRefs resolves its links asynchronously, so let that state update settle within act
    await act(async () => {
      render(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
    });

    // signature id and the leading upper-case tokens of the signature are rendered as badges
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('ET')).toBeInTheDocument();
    expect(screen.getByText('EXPLOIT')).toBeInTheDocument();
    expect(screen.getByText('NETGEAR')).toBeInTheDocument();
    // the rest of the signature is rendered as a link
    expect(
      screen.getByText('WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)')
    ).toBeInTheDocument();
    // netflow source and destination
    expect(screen.getByTestId('source-ip-badge')).toHaveTextContent('Source192.168.0.3:53');
    expect(screen.getByTestId('destination-ip-badge')).toHaveTextContent(
      'Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    delete suricata?.suricata?.eve?.alert?.signature;
    const children = suricataRowRenderer.renderRow({
      data: suricata,
      scopeId: TimelineId.test,
    });

    const { container } = render(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );

    expect(screen.queryByTestId('suricataRefs')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });
});
