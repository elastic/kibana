/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { alertRenderer } from './alert_renderer';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { defaultRowRenderers } from '.';
import { getRowRenderer } from './get_row_renderer';
import { TimelineId } from '../../../../../../common/types/timeline';

// EuiIcons coming from .testenv render the icon's aria-label as a span
// extractEuiIcon removes the aria-label before checking for equality
const extractEuiIconText = (str: string) => {
  return str.replaceAll('External link', '');
};

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/link_to');

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;
  let zeek: Ecs;
  let system: Ecs;
  let auditd: Ecs;
  const mount = useMountAppended();

  const getWrapper = async (childrenComponent: JSX.Element) => {
    const wrapper = mount(childrenComponent);
    await waitFor(() => wrapper.find('[data-test-subj="suricataRefs"]').exists());
    return wrapper;
  };
  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[1].ecs);
    suricata = cloneDeep(mockTimelineData[2].ecs);
    zeek = cloneDeep(mockTimelineData[13].ecs);
    system = cloneDeep(mockTimelineData[28].ecs);
    auditd = cloneDeep(mockTimelineData[19].ecs);
  });

  test('renders correctly against snapshot', () => {
    const rowRenderer = getRowRenderer({ data: nonSuricata, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: nonSuricata,
      scopeId: TimelineId.test,
    });

    const wrapper = shallow(<span>{row}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render plain row data when it is a non suricata row', async () => {
    const rowRenderer = getRowRenderer({ data: nonSuricata, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: nonSuricata,
      scopeId: TimelineId.test,
    });

    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('should render a suricata row data when it is a suricata row', async () => {
    const rowRenderer = getRowRenderer({ data: suricata, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: suricata,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toBe(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row data if event.category is network_traffic', async () => {
    suricata.event = { ...suricata.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer({ data: suricata, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: suricata,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toBe(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a zeek row data if event.category is network_traffic', async () => {
    zeek.event = { ...zeek.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer({ data: zeek, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: zeek,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toBe(
      'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });

  test('should render a system row data if event.category is network_traffic', async () => {
    system.event = { ...system.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer({ data: system, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: system,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'Braden@zeek-londonattempted a login via(6278)with resultfailureSource128.199.212.120'
    );
  });

  test('should render a auditd row data if event.category is network_traffic', async () => {
    auditd.event = { ...auditd.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer({ data: auditd, rowRenderers: defaultRowRenderers });
    const row = rowRenderer?.renderRow({
      data: auditd,
      scopeId: TimelineId.test,
    });
    const wrapper = await getWrapper(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'Sessionalice@zeek-sanfranin/executedgpgconf(5402)gpgconf--list-dirsagent-socketgpgconf --list-dirs agent-socket'
    );
  });
});

describe('getRowRenderer', () => {
  const auditd = cloneDeep(mockTimelineData[19].ecs);

  describe('when the data is NOT an alert', () => {
    test('it finds the the first matching instance of a row renderer', () => {
      const renderer = getRowRenderer({ data: auditd, rowRenderers: defaultRowRenderers });

      expect(renderer?.id).toEqual('auditd');
    });

    test('it returns null when there are no matching renderers', () => {
      const renderer = getRowRenderer({
        data: { _id: 'no-renderer-for-this-non-alert-data' },
        rowRenderers: defaultRowRenderers,
      });

      expect(renderer).toBeNull();
    });

    describe('which renderers are shown', () => {
      beforeEach(() => {
        const renderer = getRowRenderer({ data: auditd, rowRenderers: defaultRowRenderers });

        render(
          <TestProviders>
            <>{renderer?.renderRow({ data: auditd, scopeId: TimelineId.test })}</>
          </TestProviders>
        );
      });

      test('it does NOT show the alert renderer, because the data is NOT an alert', () => {
        expect(screen.queryByTestId('alertRenderer')).not.toBeInTheDocument();
      });

      test('it shows the event (non-alert) renderer', () => {
        expect(screen.getByTestId('render-content-user.name')).toBeInTheDocument();
      });
    });
  });

  describe('when the data IS an alert and ALSO has an event renderer', () => {
    const data = {
      ...auditd, // <-- a renderer exists for this data
      event: {
        ...auditd.event,
        kind: ['signal'], // <-- this data is (also) an alert
      },
    };

    test('it (still) returns the expected event renderer id, even though the data is also an alert', () => {
      const renderer = getRowRenderer({ data, rowRenderers: defaultRowRenderers });

      expect(renderer?.id).toEqual('auditd');
    });

    test('it does NOT return a renderer with the `alertRenderer` id', () => {
      const renderer = getRowRenderer({ data, rowRenderers: defaultRowRenderers });

      expect(renderer?.id).not.toEqual(alertRenderer.id);
    });

    describe('which renderers are shown', () => {
      beforeEach(() => {
        const renderer = getRowRenderer({ data, rowRenderers: defaultRowRenderers });

        render(
          <TestProviders>
            <>{renderer?.renderRow({ data, scopeId: TimelineId.test })}</>
          </TestProviders>
        );
      });

      test('it shows the alert renderer, because the data is ALSO an alert', () => {
        expect(screen.getByTestId('alertRenderer')).toBeInTheDocument();
      });

      test('it (also) shows the event renderer, because it is combined with the alert renderer', () => {
        expect(screen.queryAllByTestId('render-content-user.name')[0]).toBeInTheDocument();
      });
    });
  });

  describe('when the data IS an alert, but does NOT match any non-alert renderers', () => {
    const data = {
      _id: 'event-does-NOT-match-any-non-alert-renderers',
      event: {
        kind: ['signal'], // <-- this is an alert
      },
    };

    test('it falls back to returning the `alertRenderer`, because no other renderers match', () => {
      const renderer = getRowRenderer({ data, rowRenderers: defaultRowRenderers });

      expect(renderer?.id).toEqual(alertRenderer.id);
    });

    describe('which renderers are shown', () => {
      beforeEach(() => {
        const renderer = getRowRenderer({ data, rowRenderers: defaultRowRenderers });

        render(
          <TestProviders>
            <>{renderer?.renderRow({ data, scopeId: TimelineId.test })}</>
          </TestProviders>
        );
      });

      test('it (only) shows the alert renderer, because it did NOT match any non-alert renderers', () => {
        expect(screen.getByTestId('alertRenderer')).toBeInTheDocument();
      });

      test('it does NOT show the event renderer, because none were found', () => {
        expect(screen.queryByTestId('render-content-user.name')).not.toBeInTheDocument();
      });
    });
  });
});
