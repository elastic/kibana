/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import { MonitorManagementInlineContent } from './monitor_management_inline_content';

const buildData = (overrides: Partial<MonitorAttachmentData> = {}): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Test monitor',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  ...overrides,
});

describe('MonitorManagementInlineContent', () => {
  describe('status badge', () => {
    it('renders a "Proposed" badge when there is no config_id', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentStatus-proposed')).toBeInTheDocument();
    });

    it('renders an "Enabled" badge when saved + enabled', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: true,
          })}
        />
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentStatus-enabled')).toBeInTheDocument();
    });

    it('renders a "Disabled" badge when saved + disabled', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: false,
          })}
        />
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentStatus-disabled')).toBeInTheDocument();
    });

    it('renders a "CLI-managed" badge for project-origin monitors regardless of enabled flag', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: true,
            [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
          })}
        />
      );
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentStatus-cli-managed')
      ).toBeInTheDocument();
    });
  });

  describe('type chip', () => {
    it('renders an HTTP chip for HTTP monitors', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      const chip = screen.getByTestId('syntheticsMonitorAttachmentType');
      expect(chip).toHaveTextContent('HTTP');
    });

    // v1's `MonitorAttachmentData` schema is HTTP-only
    // (`z.literal(MonitorTypeEnum.HTTP)`), so passing TCP/ICMP/BROWSER
    // through `buildData(overrides)` would fail the static type check.
    // We still want to exercise the chip's defensive rendering branches
    // because T2's SML path can surface saved monitors of any type —
    // once the schema widens to accept non-HTTP, these casts can drop.
    it.each([
      [MonitorTypeEnum.TCP, 'TCP'],
      [MonitorTypeEnum.ICMP, 'ICMP'],
      [MonitorTypeEnum.BROWSER, 'Journey'],
    ])('renders %s monitors with label "%s"', (type, expectedLabel) => {
      const data = {
        ...buildData(),
        [ConfigKey.MONITOR_TYPE]: type,
      } as unknown as MonitorAttachmentData;
      render(<MonitorManagementInlineContent data={data} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentType')).toHaveTextContent(
        expectedLabel
      );
    });

    it('falls back to a generic "Monitor" label when the type is missing', () => {
      const partial = { ...buildData() } as MonitorAttachmentData;
      delete (partial as Partial<MonitorAttachmentData>)[ConfigKey.MONITOR_TYPE];
      render(<MonitorManagementInlineContent data={partial} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentType')).toHaveTextContent('Monitor');
    });
  });

  describe('status accent', () => {
    it('exposes the inferred status as a data attribute on the root', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentInline')).toHaveAttribute(
        'data-test-status',
        'proposed'
      );
    });

    it('reflects the saved-disabled status on the root', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: false,
          })}
        />
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentInline')).toHaveAttribute(
        'data-test-status',
        'disabled'
      );
    });
  });

  describe('meta block', () => {
    it('renders schedule, locations, and url', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);

      expect(screen.getByTestId('syntheticsMonitorAttachmentSchedule')).toHaveTextContent(
        'every 5m'
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentLocations')).toHaveTextContent(
        '1 location'
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentUrl')).toHaveTextContent(
        'https://example.com'
      );
    });

    it('pluralizes locations correctly', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.LOCATIONS]: [
              { id: 'us_central', isServiceManaged: true },
              { id: 'eu_west', isServiceManaged: true },
            ],
          })}
        />
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentLocations')).toHaveTextContent(
        '2 locations'
      );
    });

    it('renders "not set" when schedule is missing', () => {
      const partial = {
        ...buildData(),
      } as MonitorAttachmentData;
      // simulate an in-flight draft promoted to attachment-shape: schedule missing
      delete (partial as Partial<MonitorAttachmentData>)[ConfigKey.SCHEDULE];
      render(<MonitorManagementInlineContent data={partial} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentSchedule')).toHaveTextContent(
        'not set'
      );
    });

    it('omits the URL row when urls is empty', () => {
      const partial = { ...buildData() } as MonitorAttachmentData;
      delete (partial as Partial<MonitorAttachmentData>)[ConfigKey.URLS];
      render(<MonitorManagementInlineContent data={partial} />);
      expect(screen.queryByTestId('syntheticsMonitorAttachmentUrl')).not.toBeInTheDocument();
    });
  });

  describe('tags', () => {
    it('does not render the tag row when tags is empty', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(screen.queryByTestId('syntheticsMonitorAttachmentTags')).not.toBeInTheDocument();
    });

    it('renders one badge per tag', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({ [ConfigKey.TAGS]: ['team-a', 'prod', 'staging'] })}
        />
      );
      const tagsContainer = screen.getByTestId('syntheticsMonitorAttachmentTags');
      expect(tagsContainer).toBeInTheDocument();
      expect(tagsContainer).toHaveTextContent('team-a');
      expect(tagsContainer).toHaveTextContent('prod');
      expect(tagsContainer).toHaveTextContent('staging');
    });
  });

  it('does not crash on a minimal proposed draft (only required schema keys)', () => {
    const minimal = buildData();
    render(<MonitorManagementInlineContent data={minimal} />);
    expect(screen.getByTestId('syntheticsMonitorAttachmentInline')).toBeInTheDocument();
  });
});
