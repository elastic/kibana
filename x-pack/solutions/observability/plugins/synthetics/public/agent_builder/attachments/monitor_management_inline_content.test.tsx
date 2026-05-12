/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
  describe('header (status dot + title)', () => {
    it('renders the status dot for proposed monitors', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentStatusDot-proposed')
      ).toBeInTheDocument();
    });

    it('renders the status dot for saved+enabled monitors', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: true,
          })}
        />
      );
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentStatusDot-enabled')
      ).toBeInTheDocument();
    });

    it('renders the status dot for saved+disabled monitors', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: false,
          })}
        />
      );
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentStatusDot-disabled')
      ).toBeInTheDocument();
    });

    it('renders the status dot for CLI-managed monitors regardless of enabled flag', () => {
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
        screen.getByTestId('syntheticsMonitorAttachmentStatusDot-cli-managed')
      ).toBeInTheDocument();
    });

    it('shows the monitor name in the title', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentInlineTitle')).toHaveTextContent(
        'Test monitor'
      );
    });

    it('falls back to a placeholder title when name is empty', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({ [ConfigKey.NAME]: '' as unknown as string })}
        />
      );
      expect(screen.getByTestId('syntheticsMonitorAttachmentInlineTitle')).toHaveTextContent(
        'Untitled monitor'
      );
    });
  });

  describe('subtitle row', () => {
    it('shows the URL when present', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentInlineUrl')).toHaveTextContent(
        'https://example.com'
      );
    });

    it('falls back to the lifecycle caption when URL is missing', () => {
      const partial = { ...buildData() } as MonitorAttachmentData;
      delete (partial as Partial<MonitorAttachmentData>)[ConfigKey.URLS];
      render(<MonitorManagementInlineContent data={partial} />);
      expect(screen.queryByTestId('syntheticsMonitorAttachmentInlineUrl')).not.toBeInTheDocument();
      expect(screen.getByTestId('syntheticsMonitorAttachmentInlineSubtitle')).toHaveTextContent(
        'Draft monitor — not yet saved to Synthetics.'
      );
    });
  });

  describe('chip row (MonitorChipRow)', () => {
    it('renders the type chip, schedule, and location badges', () => {
      render(<MonitorManagementInlineContent data={buildData()} />);
      const chipRow = screen.getByTestId('syntheticsMonitorAttachmentCanvasMeta');
      expect(within(chipRow).getByTestId('syntheticsMonitorAttachmentType')).toHaveTextContent(
        'HTTP'
      );
      expect(chipRow).toHaveTextContent('Every 5 m');
      expect(chipRow).toHaveTextContent('US Central (Elastic-managed)');
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

    it('falls back to a generic "Monitor" type chip when the type is missing', () => {
      const partial = { ...buildData() } as MonitorAttachmentData;
      delete (partial as Partial<MonitorAttachmentData>)[ConfigKey.MONITOR_TYPE];
      render(<MonitorManagementInlineContent data={partial} />);
      expect(screen.getByTestId('syntheticsMonitorAttachmentType')).toHaveTextContent('Monitor');
    });

    it('renders one chip per tag', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({ [ConfigKey.TAGS]: ['team-a', 'prod', 'staging'] })}
        />
      );
      const chipRow = screen.getByTestId('syntheticsMonitorAttachmentCanvasMeta');
      expect(chipRow).toHaveTextContent('team-a');
      expect(chipRow).toHaveTextContent('prod');
      expect(chipRow).toHaveTextContent('staging');
    });

    it('renders a "Paused" badge for saved+disabled monitors', () => {
      render(
        <MonitorManagementInlineContent
          data={buildData({
            [ConfigKey.CONFIG_ID]: 'config-uuid',
            [ConfigKey.ENABLED]: false,
          })}
        />
      );
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentCanvasPausedBadge')
      ).toBeInTheDocument();
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

  it('does not crash on a minimal proposed draft (only required schema keys)', () => {
    const minimal = buildData();
    render(<MonitorManagementInlineContent data={minimal} />);
    expect(screen.getByTestId('syntheticsMonitorAttachmentInline')).toBeInTheDocument();
  });
});
