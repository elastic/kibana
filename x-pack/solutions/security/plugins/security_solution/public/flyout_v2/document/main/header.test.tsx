/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Header } from './header';
import {
  ALERT_SUMMARY_PANEL_TEST_ID,
  DOCUMENT_FLYOUT_HEADER_SHARE_BUTTON_TEST_ID,
} from '../../shared/components/test_ids';
import { useGetFlyoutLink } from '../../../flyout/document_details/right/hooks/use_get_flyout_link';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { useFlyoutSessionContext } from '../../session_context';

vi.mock('../../shared/components/settings_menu', () => {
      const mocked = {
      SettingsMenu: () => <div data-test-subj="mockSettingsMenu" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/hooks/is_in_security_app', () => {
      const mocked = {
      useIsInSecurityApp: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../session_context', () => {
      const mocked = {
      useFlyoutSessionContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          application: {
            getUrlForApp: vi.fn().mockReturnValue('/app/security/alerts/redirect/test-id'),
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/lib/kibana/hooks', () => {
      const mocked = {
      useAppUrl: () => ({
        getAppUrl: vi.fn(({ path }: { path: string }) => path),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/title', () => {
      const mocked = {
      Title: ({ hit }: { hit: DataTableRecord }) => (
        <div
          data-test-subj="mockHeaderTitle"
          data-hit-id={hit.id}
          data-event-kind={String(hit.flattened['event.kind'] ?? '')}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/severity', () => {
      const mocked = {
      DocumentSeverity: ({ hit }: { hit: DataTableRecord }) => (
        <div data-test-subj="mockDocumentSeverity" data-hit-id={hit.id} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/risk_score', () => {
      const mocked = {
      RiskScore: ({ hit }: { hit: DataTableRecord }) => (
        <div data-test-subj="mockRiskScore" data-hit-id={hit.id} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/status', () => {
      const mocked = {
      Status: ({ hit }: { hit: DataTableRecord }) => (
        <div data-test-subj="mockHeaderStatus" data-hit-id={hit.id} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../shared/components/notes', () => {
      const mocked = {
      Notes: ({ documentId, onShowNotes }: { documentId: string; onShowNotes?: () => void }) => (
        <button
          type="button"
          data-test-subj="mockNotes"
          data-document-id={documentId}
          data-has-open-notes-tab={String(onShowNotes != null)}
          onClick={onShowNotes}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/assignees', () => {
      const mocked = {
      Assignees: ({ hit, onAlertUpdated }: { hit: DataTableRecord; onAlertUpdated: () => void }) => (
        <div
          data-test-subj="mockAssignees"
          data-hit-id={hit.id}
          data-has-on-assignees-updated={String(onAlertUpdated != null)}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../shared/components/share_url_icon_button', () => {
      const mocked = {
      ShareUrlIconButton: ({
        url,
        dataTestSubj,
      }: {
        url: string | null | undefined;
        dataTestSubj: string;
      }) => (url ? <button type="button" data-test-subj={dataTestSubj} /> : null),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout/document_details/right/hooks/use_get_flyout_link', () => {
      const mocked = {
      useGetFlyoutLink: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/formatted_date', () => {
      const mocked = {
      PreferenceFormattedDate: ({ value }: { value: Date }) => (
        <div data-test-subj="mockPreferenceFormattedDate">{value.toISOString()}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.name': 'Test Rule',
  'kibana.alert.rule.uuid': 'test-rule-id',
  'kibana.alert.risk_score': 21,
  '@timestamp': '2023-01-01T00:00:00.000Z',
});

const alertHitNoRiskScore = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.name': 'Test Rule',
  'kibana.alert.rule.uuid': 'test-rule-id',
  '@timestamp': '2023-01-01T00:00:00.000Z',
});

const eventHit = createMockHit({
  'event.kind': 'event',
  'kibana.alert.risk_score': 21,
});

const defaultHeaderProps: Pick<Parameters<typeof Header>[0], 'onAlertUpdated' | 'onShowNotes'> = {
  onAlertUpdated: vi.fn(),
  onShowNotes: vi.fn(),
};

type RenderHeaderProps = Omit<Parameters<typeof Header>[0], 'onAlertUpdated' | 'onShowNotes'> &
  Partial<Pick<Parameters<typeof Header>[0], 'onAlertUpdated' | 'onShowNotes'>>;

const renderHeader = (props: RenderHeaderProps) =>
  render(
    <IntlProvider locale="en">
      <Header {...defaultHeaderProps} {...props} />
    </IntlProvider>
  );

const mockUseGetFlyoutLink = useGetFlyoutLink as Mock;

describe('<DocumentHeader />', () => {
  beforeEach(() => {
    mockUseGetFlyoutLink.mockReturnValue(null);
    // Default to outside Security so existing assertions are unaffected by the settings menu.
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    // Default to a main flyout; child-flyout cases override below.
    (useFlyoutSessionContext as Mock).mockReturnValue({
      session: 'start',
      historyKey: Symbol('history'),
      isChildFlyout: false,
    });
  });
  it('should pass the hit to the severity component', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockDocumentSeverity')).toHaveAttribute('data-hit-id', '1');
  });

  it('should render the inline timestamp when present', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockPreferenceFormattedDate')).toHaveTextContent(
      '2023-01-01T00:00:00.000Z'
    );
  });

  it('should pass the hit to the header title', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-hit-id', '1');
    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-event-kind', 'signal');
  });

  it('should pass alert documents to the header title', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-hit-id', '1');
    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-event-kind', 'signal');
  });

  it('should pass non-alert documents to the header title', () => {
    const { getByTestId } = renderHeader({ hit: eventHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-hit-id', '1');
    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-event-kind', 'event');
  });

  it('should render the alert summary blocks for alerts', () => {
    const onOpenNotesTab = vi.fn();
    const onAlertUpdated = vi.fn();
    const { getByTestId } = renderHeader({
      hit: alertHit,
      onAlertUpdated,
      onShowNotes: onOpenNotesTab,
    });

    expect(getByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('mockHeaderStatus')).toBeInTheDocument();
    expect(getByTestId('mockRiskScore')).toBeInTheDocument();
    expect(getByTestId('mockAssignees')).toHaveAttribute('data-hit-id', '1');
    expect(getByTestId('mockAssignees')).toHaveAttribute('data-has-on-assignees-updated', 'true');
    expect(getByTestId('mockNotes')).toHaveAttribute('data-has-open-notes-tab', 'true');
  });

  it('should not render the alert summary blocks for non-alert events', () => {
    const { queryByTestId } = renderHeader({ hit: eventHit });

    expect(queryByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId('mockHeaderStatus')).not.toBeInTheDocument();
    expect(queryByTestId('mockAssignees')).not.toBeInTheDocument();
    expect(queryByTestId('mockNotes')).not.toBeInTheDocument();
    expect(queryByTestId('mockRiskScore')).not.toBeInTheDocument();
  });

  it('should render the risk score block when the alert has no risk score', () => {
    const { getByTestId } = renderHeader({ hit: alertHitNoRiskScore });

    expect(getByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('mockHeaderStatus')).toBeInTheDocument();
    expect(getByTestId('mockRiskScore')).toBeInTheDocument();
  });

  it('should render the status block for alerts', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockHeaderStatus')).toBeInTheDocument();
  });

  it('should not render the summary block for non-alert documents', () => {
    const { queryByTestId } = renderHeader({ hit: eventHit });

    expect(queryByTestId(ALERT_SUMMARY_PANEL_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the share button for alerts when a link is available', () => {
    mockUseGetFlyoutLink.mockReturnValue('https://example.com/alerts/redirect/test-id');
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId(DOCUMENT_FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render the share button for alerts when link is null (e.g. preview index)', () => {
    mockUseGetFlyoutLink.mockReturnValue(null);
    const { queryByTestId } = renderHeader({ hit: alertHit });

    expect(queryByTestId(DOCUMENT_FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render the share button for non-alert events', () => {
    mockUseGetFlyoutLink.mockReturnValue('https://example.com/alerts/redirect/test-id');
    const { queryByTestId } = renderHeader({ hit: eventHit });

    expect(queryByTestId(DOCUMENT_FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the settings menu inside the Security Solution app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(true);
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockSettingsMenu')).toBeInTheDocument();
  });

  it('should not render the settings menu outside the Security Solution app (e.g. Discover)', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    const { queryByTestId } = renderHeader({ hit: alertHit });

    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
  });

  it('should not render the settings menu in a child flyout (its controls are inert there)', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(true);
    (useFlyoutSessionContext as Mock).mockReturnValue({
      session: 'inherit',
      historyKey: Symbol('history'),
      isChildFlyout: true,
    });
    const { queryByTestId } = renderHeader({ hit: alertHit });

    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
  });
});
