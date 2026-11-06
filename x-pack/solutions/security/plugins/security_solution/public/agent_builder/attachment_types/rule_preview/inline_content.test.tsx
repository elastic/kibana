/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { RulePreviewAttachment } from './types';
import { RulePreviewInlineContent } from './inline_content';

jest.mock('./providers', () => ({
  RulePreviewAttachmentSecurityProviders: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  RulePreviewAttachmentDataViewBootstrap: () => null,
}));

jest.mock(
  '../../../detection_engine/rule_creation_ui/components/rule_preview/rule_preview_alerts_table',
  () => ({
    RulePreviewAlertsTable: () => <div data-test-subj="mockAlertsTable" />,
  })
);

const makeAttachment = (previewId: string): RulePreviewAttachment =>
  ({
    id: 'test-attachment',
    type: SecurityAgentBuilderAttachments.rulePreview,
    data: { previewId },
  } as RulePreviewAttachment);

const makeSpaces = (spaceId = 'default'): SpacesPluginStart =>
  ({
    getActiveSpace: jest.fn().mockResolvedValue({ id: spaceId }),
  } as unknown as SpacesPluginStart);

const makeData = (totalHits = 0): DataPublicPluginStart =>
  ({
    search: {
      search: jest.fn().mockReturnValue(
        of({
          rawResponse: {
            hits: { total: { value: totalHits, relation: 'eq' }, hits: [] },
            aggregations:
              totalHits > 0
                ? {
                    minTimestamp: { value: 1716800000000 },
                    maxTimestamp: { value: 1716800600000 },
                    ruleTypes: { buckets: [{ key: 'esql', doc_count: totalHits }] },
                  }
                : {},
          },
        })
      ),
    },
  } as unknown as DataPublicPluginStart);

const renderContent = (
  spaces: SpacesPluginStart,
  data: DataPublicPluginStart,
  previewId = 'preview-1'
) =>
  render(
    <I18nProvider>
      <RulePreviewInlineContent
        attachment={makeAttachment(previewId)}
        isSidebar={false}
        spaces={spaces}
        data={data}
        getServices={jest.fn()}
        getStore={jest.fn()}
      />
    </I18nProvider>
  );

describe('RulePreviewInlineContent', () => {
  it('shows a loading spinner while the space and metadata are being fetched', () => {
    const spaces = {
      getActiveSpace: jest.fn().mockReturnValue(new Promise(() => {})),
    } as unknown as SpacesPluginStart;

    renderContent(spaces, makeData());

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('mockAlertsTable')).not.toBeInTheDocument();
  });

  it('shows the empty callout when no preview alerts are found', async () => {
    await act(async () => {
      renderContent(makeSpaces(), makeData(0));
    });

    await waitFor(() => {
      expect(screen.getByText('No rule preview alerts found')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mockAlertsTable')).not.toBeInTheDocument();
  });

  it('renders the alerts table when preview alerts are present', async () => {
    await act(async () => {
      renderContent(makeSpaces(), makeData(5));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mockAlertsTable')).toBeInTheDocument();
    });
  });

  it('shows the error callout when fetching the active space fails', async () => {
    const spaces = {
      getActiveSpace: jest.fn().mockRejectedValue(new Error('space error')),
    } as unknown as SpacesPluginStart;

    await act(async () => {
      renderContent(spaces, makeData());
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load rule preview')).toBeInTheDocument();
    });
  });
});
