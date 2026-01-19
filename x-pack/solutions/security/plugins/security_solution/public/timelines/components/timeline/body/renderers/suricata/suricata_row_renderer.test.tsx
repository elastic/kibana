/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData } from '../../../../../../common/mock';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { suricataRowRenderer } from './suricata_row_renderer';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
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

describe('suricata_row_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;
  const mount = useMountAppended();

  const getWrapper = async (childrenComponent: JSX.Element) => {
    const wrapper = mount(childrenComponent);
    await waitFor(() => wrapper.find('[data-test-subj="suricataRefs"]').exists());
    return wrapper;
  };

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

    const wrapper = await getWrapper(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );

    const extractEuiIconText = removeExternalLinkText(wrapper.text()).replaceAll(
      'External link',
      ''
    );
    expect(extractEuiIconText).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', async () => {
    delete suricata?.suricata?.eve?.alert?.signature;
    const children = suricataRowRenderer.renderRow({
      data: suricata,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });
});
