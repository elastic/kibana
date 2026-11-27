/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { render } from '@testing-library/react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import { zeekRowRenderer } from './zeek_row_renderer';
import { TimelineId } from '../../../../../../../common/types/timeline';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');

describe('zeek_row_renderer', () => {
  let nonZeek: Ecs;
  let zeek: Ecs;

  beforeEach(() => {
    nonZeek = cloneDeep(mockTimelineData[0].ecs);
    zeek = cloneDeep(mockTimelineData[13].ecs);
  });

  test('renders the row details for a zeek datum', () => {
    const children = zeekRowRenderer.renderRow({
      data: zeek,
      scopeId: TimelineId.test,
    });

    const { container } = render(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );

    expect(container).toHaveTextContent('Connection attempt rejected');
    expect(container).toHaveTextContent('185.176.26.101:44059');
    expect(container).toHaveTextContent('207.154.238.205:11568');
  });

  test('should return false if not a zeek datum', () => {
    expect(zeekRowRenderer.isInstance(nonZeek)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(zeekRowRenderer.isInstance(zeek)).toBe(true);
  });

  test('should render a zeek row', () => {
    const children = zeekRowRenderer.renderRow({
      data: zeek,
      scopeId: TimelineId.test,
    });
    const { container } = render(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );

    const extractEuiIconText = removeExternalLinkText(container.textContent).replaceAll(
      'External link',
      ''
    );
    expect(extractEuiIconText).toContain(
      'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });
});
