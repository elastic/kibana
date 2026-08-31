/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { AttackTabContent } from './attack_tab_content';
import {
  ATTACK_TAB_BULK_ACTIONS_TEST_ID,
  ATTACK_TAB_BULK_REMOVE_TEST_ID,
  ATTACK_TAB_COLUMN_ACTIONS_TEST_ID,
  ATTACK_TAB_COLUMN_ALERTS_TEST_ID,
  ATTACK_TAB_COLUMN_ATTACHED_AT_TEST_ID,
  ATTACK_TAB_COLUMN_ATTACHED_BY_TEST_ID,
  ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID,
  ATTACK_TAB_COLUMN_RISK_SCORE_TEST_ID,
  ATTACK_TAB_COLUMN_SUMMARY_TEST_ID,
  ATTACK_TAB_COLUMN_TITLE_TEST_ID,
  ATTACK_TAB_EMPTY_TEST_ID,
  ATTACK_TAB_GRID_TEST_ID,
  ATTACK_TAB_ROW_SELECT_TEST_ID,
  ATTACK_TAB_ROW_STATUS_TEST_ID,
  ATTACK_TAB_ROW_TITLE_TEST_ID,
  ATTACK_TAB_ROW_UNRESOLVED_TEST_ID,
  ATTACK_TAB_SELECT_ALL_TEST_ID,
  ATTACK_TAB_TABLE_TEST_ID,
  REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID,
  REMOVE_ATTACK_BUTTON_TEST_ID,
  REMOVE_ATTACK_MODAL_TEST_ID,
  SHOW_ATTACK_BUTTON_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { allCasesPermissions } from '../../../../cases_test_utils';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useRemoveAttackAttachment } from '../hooks/use_remove_attack_attachment';
import { useRemovableAlertAttachments } from '../hooks/use_removable_alert_attachments';
import { ATTACK_TAB_COLUMN_ID } from '../utils';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock('../../../../assistant/use_assistant_availability');
jest.mock('../hooks/use_remove_attack_attachment');
jest.mock('../hooks/use_removable_alert_attachments');
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
const mockOpenAttackFlyout = jest.fn();
jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openAttackFlyout: mockOpenAttackFlyout }),
}));
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));

/** EUI's own handles on the data grid controls, which have no constant of ours to come from. */
const EUI_COLUMN_SELECTOR_TEST_ID = 'dataGridColumnSelectorButton';
const EUI_COLUMN_SORTING_TEST_ID = 'dataGridColumnSortingButton';
const EUI_DISPLAY_SELECTOR_TEST_ID = 'dataGridDisplaySelectorButton';
const EUI_FULL_SCREEN_TEST_ID = 'dataGridFullScreenButton';
const EUI_PAGINATION_TEST_ID = 'tablePaginationPopoverButton';
const EUI_TEN_ROWS_PER_PAGE_TEST_ID = 'tablePagination-10-rows';
const EUI_CELL_EXPAND_TEST_ID = 'euiDataGridCellExpandButton';
const euiHeaderActionsTestId = (columnId: string) => `dataGridHeaderCellActionButton-${columnId}`;
const euiPaginationButtonTestId = (pageNumber: number) => `pagination-button-${pageNumber - 1}`;
const euiColumnToggleTestId = (columnId: string) =>
  `dataGridColumnSelectorToggleColumnVisibility-${columnId}`;

const useFindAttackDiscoveriesMock = useFindAttackDiscoveries as jest.Mock;
const useAssistantAvailabilityMock = useAssistantAvailability as jest.Mock;
const useRemoveAttackAttachmentMock = useRemoveAttackAttachment as jest.Mock;
const useRemovableAlertAttachmentsMock = useRemovableAlertAttachments as jest.Mock;
const mockedUseKibana = mockUseKibana();
const removeAttack = jest.fn();

const buildAttachment = (overrides: Record<string, unknown> = {}) => ({
  id: 'so-1',
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  attachmentId: 'attack-id-1',
  createdAt: '2024-05-02T10:00:00.000Z',
  createdBy: { fullName: 'Ada Lovelace', username: 'ada', email: null },
  metadata: {
    title: 'Snapshotted attack title',
    summaryMarkdown: 'An adversary dumped {{ process.name lsass.exe }} memory',
    riskScore: 42,
    alertCount: 4,
    entityCount: 2,
    timestamp: '2024-04-01T09:00:00.000Z',
    index: '.alerts-security.attack.discovery.alerts-default',
  },
  ...overrides,
});

const buildCaseData = (comments: unknown[]) =>
  ({
    id: 'case-1',
    owner: 'securitySolution',
    comments,
  } as CommonAttachmentListViewProps['caseData']);

const liveAttack = {
  id: 'attack-id-1',
  title: 'Live attack title',
  summaryMarkdown: 'The adversary escalated on {{ host.name win-01 }}',
  riskScore: 77,
  alertIds: ['a', 'b', 'c'],
  alertWorkflowStatus: 'acknowledged',
  timestamp: '2024-05-01T08:30:00.000Z',
  index: '.alerts-security.attack.discovery.alerts-default',
  replacements: {},
};

const mockFindResult = (attacks: unknown[], overrides: Record<string, unknown> = {}) => {
  useFindAttackDiscoveriesMock.mockReturnValue({
    data: { data: attacks, page: 1, per_page: 10, total: attacks.length, connector_names: [] },
    isLoading: false,
    status: 'success',
    error: undefined,
    cancelRequest: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  });
};

const renderTab = (props?: Partial<CommonAttachmentListViewProps>) =>
  render(
    <TestProviders>
      <AttackTabContent caseData={buildCaseData([buildAttachment()])} {...props} />
    </TestProviders>
  );

const renderAttachments = (comments: unknown[]) =>
  render(
    <TestProviders>
      <AttackTabContent caseData={buildCaseData(comments)} />
    </TestProviders>
  );

const cellTexts = (testId: string) => screen.getAllByTestId(testId).map((cell) => cell.textContent);

/** Both row actions are keyed by the attachment saved object id, not the attack document id. */
const showAttackButton = (savedObjectId: string) =>
  screen.getByTestId(`${SHOW_ATTACK_BUTTON_TEST_ID}-${savedObjectId}`);

const removeAttackButton = (savedObjectId: string) =>
  screen.getByTestId(`${REMOVE_ATTACK_BUTTON_TEST_ID}-${savedObjectId}`);

/** The grid cell wrapping a rendered cell body, which is where the grid puts column order. */
const gridCellOf = (testId: string): HTMLElement => {
  const cell = screen.getByTestId(testId).closest('[role="gridcell"]');

  if (!(cell instanceof HTMLElement)) {
    throw new Error(`No grid cell wraps ${testId}`);
  }

  return cell;
};

/** Sorts the grid through the column header's own actions, as a user would. */
const sortColumn = async (columnId: string, label: string) => {
  await userEvent.click(screen.getByTestId(euiHeaderActionsTestId(columnId)));
  await userEvent.click(await screen.findByText(label));
};

describe('AttackTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssistantAvailabilityMock.mockReturnValue({ isAssistantEnabled: true });
    mockFindResult([liveAttack]);
    mockedUseKibana.services.cases.helpers.canUseCases = jest
      .fn()
      .mockReturnValue(allCasesPermissions());
    useRemoveAttackAttachmentMock.mockReturnValue({ mutate: removeAttack, isLoading: false });
    useRemovableAlertAttachmentsMock.mockReturnValue({
      isLoading: false,
      isResolvable: true,
      attachmentIds: ['so-alert-1', 'so-alert-2'],
      alertIds: ['alert-1', 'alert-2'],
    });
  });

  it('renders an empty state and fires no query when no attacks are attached', () => {
    renderAttachments([]);

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toHaveTextContent(
      'No attacks have been attached to this case yet.'
    );
    expect(screen.queryByTestId(ATTACK_TAB_TABLE_TEST_ID)).not.toBeInTheDocument();
    expect(useFindAttackDiscoveriesMock).not.toHaveBeenCalled();
  });

  it('renders an empty state when the search term matches no attachment', () => {
    renderTab({ searchTerm: 'kerberoasting' });

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toHaveTextContent(
      'No attacks match your search.'
    );
    expect(useFindAttackDiscoveriesMock).not.toHaveBeenCalled();
  });

  it('keeps attachments matching the search term', () => {
    renderTab({ searchTerm: 'snapshotted' });

    expect(screen.getByTestId(ATTACK_TAB_GRID_TEST_ID)).toBeInTheDocument();
  });

  it('queries every attached attack id in a single request', () => {
    renderAttachments([
      buildAttachment(),
      buildAttachment({ id: 'so-2', attachmentId: 'attack-id-2' }),
    ]);

    expect(useFindAttackDiscoveriesMock).toHaveBeenCalledTimes(1);
    expect(useFindAttackDiscoveriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: ['attack-id-1', 'attack-id-2'],
        includeAllAuthors: true,
        isAssistantEnabled: true,
        perPage: 2,
      })
    );
  });

  it('ignores attachments of other types', () => {
    renderAttachments([buildAttachment({ type: 'security.alert' })]);

    expect(screen.getByTestId(ATTACK_TAB_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  describe('the grid', () => {
    it('renders the default columns from the live attack document', () => {
      renderTab();

      expect(screen.getByTestId(ATTACK_TAB_GRID_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID)).toHaveTextContent(
        'May 1, 2024 @ 08:30:00.000'
      );
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_TITLE_TEST_ID)).toHaveTextContent(
        'Live attack title'
      );
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_ALERTS_TEST_ID)).toHaveTextContent('3');
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_SUMMARY_TEST_ID)).toHaveTextContent(
        'The adversary escalated on win-01'
      );
    });

    it('renders the detection time rather than the time the attack was attached', () => {
      renderTab();

      // `createdAt` is May 2nd; the attack was detected on May 1st.
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID)).not.toHaveTextContent(
        'May 2, 2024'
      );
    });

    it('falls back to the snapshotted detection time when the live document has none', () => {
      mockFindResult([]);

      renderTab();

      expect(screen.getByTestId(ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID)).toHaveTextContent(
        'Apr 1, 2024 @ 09:00:00.000'
      );
    });

    it('renders the empty value when neither the document nor the snapshot has a detection time', () => {
      mockFindResult([]);

      renderAttachments([
        buildAttachment({
          metadata: {
            title: 'Attached before timestamps were captured',
            alertCount: 1,
            index: '.alerts-security.attack.discovery.alerts-default',
          },
        }),
      ]);

      expect(screen.getByTestId(ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID)).toHaveTextContent('—');
    });

    it('hides the risk score, status and provenance columns until they are picked', () => {
      renderTab();

      expect(screen.queryByTestId(ATTACK_TAB_COLUMN_RISK_SCORE_TEST_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(ATTACK_TAB_ROW_STATUS_TEST_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(ATTACK_TAB_COLUMN_ATTACHED_BY_TEST_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(ATTACK_TAB_COLUMN_ATTACHED_AT_TEST_ID)).not.toBeInTheDocument();
    });

    it('offers a column selector and a sort selector, and no full screen or display controls', () => {
      renderTab();

      expect(screen.getByTestId(EUI_COLUMN_SELECTOR_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(EUI_COLUMN_SORTING_TEST_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(EUI_FULL_SCREEN_TEST_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(EUI_DISPLAY_SELECTOR_TEST_ID)).not.toBeInTheDocument();
    });

    it('renders a hidden column, and its Unknown attaching user, once it is picked', async () => {
      renderAttachments([
        buildAttachment({ createdBy: { fullName: null, username: null, email: null } }),
      ]);

      await userEvent.click(screen.getByTestId(EUI_COLUMN_SELECTOR_TEST_ID));
      await userEvent.click(
        await screen.findByTestId(euiColumnToggleTestId(ATTACK_TAB_COLUMN_ID.attachedBy))
      );

      expect(screen.getByTestId(ATTACK_TAB_COLUMN_ATTACHED_BY_TEST_ID)).toHaveTextContent(
        'Unknown'
      );
    });

    it('paginates 50 rows at a time', () => {
      // The grid only renders its pagination bar once there are more rows than the smallest
      // page size option.
      renderAttachments(
        Array.from({ length: 12 }, (_, index) =>
          buildAttachment({ id: `so-${index}`, attachmentId: `attack-id-${index}` })
        )
      );

      expect(screen.getByTestId(EUI_PAGINATION_TEST_ID)).toHaveTextContent('Rows per page: 50');
    });
  });

  describe('the summary column', () => {
    const summaryCell = () => screen.getByTestId(ATTACK_TAB_COLUMN_SUMMARY_TEST_ID);

    it('prefers the live summary, de-anonymised', () => {
      mockFindResult([
        {
          ...liveAttack,
          summaryMarkdown: 'The adversary escalated on {{ host.name ea25b45c }}',
          replacements: { ea25b45c: 'win-01' },
        },
      ]);

      renderTab();

      expect(summaryCell()).toHaveTextContent('The adversary escalated on win-01');
    });

    it('renders the snapshotted summary when the live document cannot be resolved', () => {
      mockFindResult([]);

      renderTab();

      expect(summaryCell()).toHaveTextContent('An adversary dumped lsass.exe memory');
    });

    it('renders plain text with no markdown field syntax', () => {
      mockFindResult([]);

      renderTab();

      expect(summaryCell().textContent).not.toContain('{{');
      expect(summaryCell().textContent).not.toContain('}}');
    });

    it('does not de-anonymise the snapshotted summary a second time', () => {
      // The snapshot was de-anonymised at attach time, so it holds original values. A word of it
      // that also happens to be a replacement key must survive verbatim.
      mockFindResult([{ ...liveAttack, summaryMarkdown: '', replacements: { admin: 'root' } }]);

      renderAttachments([
        buildAttachment({
          metadata: {
            title: 'Snapshotted attack title',
            summaryMarkdown: 'admin escalated privileges',
            alertCount: 1,
            timestamp: '2024-04-01T09:00:00.000Z',
            index: '.alerts-security.attack.discovery.alerts-default',
          },
        }),
      ]);

      expect(summaryCell()).toHaveTextContent('admin escalated privileges');
    });

    it('renders the empty value for an attachment written before summaries were captured', () => {
      mockFindResult([]);

      renderAttachments([
        buildAttachment({
          metadata: {
            title: 'Attached before summaries were captured',
            alertCount: 1,
            timestamp: '2024-04-01T09:00:00.000Z',
            index: '.alerts-security.attack.discovery.alerts-default',
          },
        }),
      ]);

      expect(summaryCell()).toHaveTextContent('—');
    });

    it('clips the summary to a single line', () => {
      renderTab();

      expect(summaryCell()).toHaveStyleRule('overflow', 'hidden');
      expect(summaryCell()).toHaveStyleRule('text-overflow', 'ellipsis');
      expect(summaryCell()).toHaveStyleRule('white-space', 'nowrap');
    });

    it('reveals the untruncated summary through the cell expansion popover', async () => {
      const longSummary = `The adversary authenticated as {{ user.name svc-backup }} and then ${'moved laterally through the estate '.repeat(
        8
      )}before exfiltrating data.`;
      mockFindResult([{ ...liveAttack, summaryMarkdown: longSummary }]);

      renderTab();

      await userEvent.hover(summaryCell());
      await userEvent.click(await screen.findByTestId(EUI_CELL_EXPAND_TEST_ID));

      const [, expanded] = screen.getAllByTestId(ATTACK_TAB_COLUMN_SUMMARY_TEST_ID);
      expect(expanded).toHaveTextContent('before exfiltrating data.');
      expect(expanded).not.toHaveStyleRule('white-space', 'nowrap');
    });
  });

  describe('sorting', () => {
    const attachmentsByDetectionTime = [
      buildAttachment({
        id: 'so-oldest',
        attachmentId: 'attack-oldest',
        metadata: {
          title: 'Oldest',
          alertCount: 1,
          timestamp: '2024-01-01T00:00:00.000Z',
          index: '.alerts-security.attack.discovery.alerts-default',
        },
      }),
      buildAttachment({
        id: 'so-newest',
        attachmentId: 'attack-newest',
        metadata: {
          title: 'Newest',
          alertCount: 1,
          timestamp: '2024-03-01T00:00:00.000Z',
          index: '.alerts-security.attack.discovery.alerts-default',
        },
      }),
      buildAttachment({
        id: 'so-undated',
        attachmentId: 'attack-undated',
        metadata: {
          title: 'Undated',
          alertCount: 1,
          index: '.alerts-security.attack.discovery.alerts-default',
        },
      }),
    ];

    beforeEach(() => {
      mockFindResult([]);
    });

    it('sorts by the detection time, newest first, by default', () => {
      renderAttachments(attachmentsByDetectionTime);

      expect(cellTexts(ATTACK_TAB_COLUMN_TITLE_TEST_ID)).toEqual(['Newest', 'Oldest', 'Undated']);
    });

    it('keeps rows with no detection time last when sorted oldest first', async () => {
      renderAttachments(attachmentsByDetectionTime);

      await sortColumn('detectedOn', 'Sort A-Z');

      expect(cellTexts(ATTACK_TAB_COLUMN_TITLE_TEST_ID)).toEqual(['Oldest', 'Newest', 'Undated']);
    });
  });

  describe('unresolved attacks', () => {
    it('falls back to the snapshotted metadata and disables navigation', () => {
      mockFindResult([]);

      renderTab();

      expect(screen.getByTestId(ATTACK_TAB_ROW_TITLE_TEST_ID)).toHaveTextContent(
        'Snapshotted attack title'
      );
      expect(screen.getByTestId(ATTACK_TAB_COLUMN_ALERTS_TEST_ID)).toHaveTextContent('4');
      expect(showAttackButton('so-1')).toBeDisabled();
    });

    it('explains itself through a tooltip reachable by keyboard', () => {
      mockFindResult([]);

      renderTab();

      expect(screen.getByTestId(ATTACK_TAB_ROW_UNRESOLVED_TEST_ID)).toHaveAttribute(
        'tabindex',
        '0'
      );
    });

    it('keeps an unresolved row alongside a resolved one', () => {
      mockFindResult([liveAttack]);

      renderAttachments([
        buildAttachment(),
        buildAttachment({
          id: 'so-2',
          attachmentId: 'attack-id-2',
          metadata: {
            title: 'Deleted attack',
            alertCount: 1,
            timestamp: '2024-04-30T09:00:00.000Z',
            index: '.alerts-security.attack.discovery.alerts-default',
          },
        }),
      ]);

      expect(screen.getAllByTestId(ATTACK_TAB_ROW_TITLE_TEST_ID)).toHaveLength(2);
      expect(showAttackButton('so-1')).toBeEnabled();
      expect(showAttackButton('so-2')).toBeDisabled();
    });

    it('does not mark rows unresolved while the query is still loading', () => {
      mockFindResult([], { isLoading: true, status: 'loading', data: undefined });

      renderTab();

      expect(screen.queryByTestId(ATTACK_TAB_ROW_UNRESOLVED_TEST_ID)).not.toBeInTheDocument();
      expect(showAttackButton('so-1')).toBeEnabled();
    });
  });

  describe('the row actions control column', () => {
    const openRemovalPrompt = async () => {
      await userEvent.click(removeAttackButton('so-1'));
    };

    const confirmRemoval = async () => {
      await userEvent.click(screen.getByText('Remove'));
    };

    it('renders both actions on every row', () => {
      renderAttachments([
        buildAttachment(),
        buildAttachment({ id: 'so-2', attachmentId: 'attack-id-2' }),
      ]);

      expect(screen.getAllByTestId(ATTACK_TAB_COLUMN_ACTIONS_TEST_ID)).toHaveLength(2);
      expect(showAttackButton('so-1')).toBeInTheDocument();
      expect(removeAttackButton('so-1')).toBeInTheDocument();
      expect(showAttackButton('so-2')).toBeInTheDocument();
      expect(removeAttackButton('so-2')).toBeInTheDocument();
    });

    it('leads the row, ahead of the first data column', () => {
      renderTab();

      const cells = Array.from(
        screen.getByTestId(ATTACK_TAB_GRID_TEST_ID).querySelectorAll('[role="gridcell"]')
      );

      expect(cells.indexOf(gridCellOf(ATTACK_TAB_COLUMN_ACTIONS_TEST_ID))).toBeLessThan(
        cells.indexOf(gridCellOf(ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID))
      );
    });

    it('exposes the show attack button on each row', () => {
      renderTab();

      expect(showAttackButton('so-1')).toBeEnabled();
    });

    it('exposes the remove attack button on each row', () => {
      renderTab();

      expect(removeAttackButton('so-1')).toBeEnabled();
    });

    it('keeps both actions in the keyboard tab order', async () => {
      renderTab();

      showAttackButton('so-1').focus();
      expect(showAttackButton('so-1')).toHaveFocus();

      await userEvent.tab();

      expect(removeAttackButton('so-1')).toHaveFocus();
    });

    it('opens the attack flyout when the show action is activated by keyboard', async () => {
      renderTab();

      showAttackButton('so-1').focus();
      await userEvent.keyboard('{Enter}');

      expect(mockOpenAttackFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ attackId: 'attack-id-1' })
      );
    });

    it('opens the removal prompt when the remove action is activated by keyboard', async () => {
      renderTab();

      removeAttackButton('so-1').focus();
      await userEvent.keyboard('{Enter}');

      expect(await screen.findByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).toBeInTheDocument();
    });

    it('offers to remove the related alerts when removing a single attack', async () => {
      renderTab();

      await openRemovalPrompt();

      expect(screen.getByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID)).toBeEnabled();
    });

    it('removes only the attack attachment when the checkbox is left unchecked', async () => {
      renderTab();

      await openRemovalPrompt();
      await confirmRemoval();

      expect(removeAttack).toHaveBeenCalledWith({
        caseId: 'case-1',
        attackAttachmentIds: ['so-1'],
        alertAttachmentIds: [],
      });
    });

    it('removes the resolved alert attachments too when the checkbox is checked', async () => {
      renderTab();

      await openRemovalPrompt();
      await userEvent.click(screen.getByTestId(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID));
      await confirmRemoval();

      expect(removeAttack).toHaveBeenCalledTimes(1);
      expect(removeAttack).toHaveBeenCalledWith({
        caseId: 'case-1',
        attackAttachmentIds: ['so-1'],
        alertAttachmentIds: ['so-alert-1', 'so-alert-2'],
      });
    });

    it('disables the remove button while a removal is in flight', () => {
      useRemoveAttackAttachmentMock.mockReturnValue({ mutate: removeAttack, isLoading: true });

      renderTab();

      expect(screen.getByTestId(`${REMOVE_ATTACK_BUTTON_TEST_ID}-so-1`)).toBeDisabled();
    });

    it('still offers removal for an attack that could not be resolved', () => {
      mockFindResult([]);

      renderTab();

      expect(screen.getByTestId(`${REMOVE_ATTACK_BUTTON_TEST_ID}-so-1`)).toBeEnabled();
    });
  });

  describe('the selection control column', () => {
    const selectAllCheckbox = () => screen.getByTestId(ATTACK_TAB_SELECT_ALL_TEST_ID);

    const rowCheckbox = (savedObjectId: string) =>
      screen.getByTestId(`${ATTACK_TAB_ROW_SELECT_TEST_ID}-${savedObjectId}`);

    const twoAttachments = () => [
      buildAttachment(),
      buildAttachment({ id: 'so-2', attachmentId: 'attack-id-2' }),
    ];

    /** Twelve unresolvable attachments, so every row sorts on the same snapshotted timestamp. */
    const renderTwelveAttachments = () => {
      mockFindResult([]);

      return renderAttachments(
        Array.from({ length: 12 }, (_, index) =>
          buildAttachment({ id: `so-${index}`, attachmentId: `attack-id-${index}` })
        )
      );
    };

    const showTenRowsPerPage = async () => {
      await userEvent.click(screen.getByTestId(EUI_PAGINATION_TEST_ID));
      await userEvent.click(await screen.findByTestId(EUI_TEN_ROWS_PER_PAGE_TEST_ID));
    };

    const goToPage = async (pageNumber: number) => {
      await userEvent.click(screen.getByTestId(euiPaginationButtonTestId(pageNumber)));
    };

    it('leads the row, ahead of the actions column', () => {
      renderTab();

      const cells = Array.from(
        screen.getByTestId(ATTACK_TAB_GRID_TEST_ID).querySelectorAll('[role="gridcell"]')
      );

      expect(cells.indexOf(gridCellOf(`${ATTACK_TAB_ROW_SELECT_TEST_ID}-so-1`))).toBeLessThan(
        cells.indexOf(gridCellOf(ATTACK_TAB_COLUMN_ACTIONS_TEST_ID))
      );
    });

    it('labels every checkbox with the attack it selects', () => {
      renderAttachments(twoAttachments());

      expect(selectAllCheckbox()).toHaveAccessibleName('Select all attacks');
      expect(rowCheckbox('so-1')).toHaveAccessibleName('Select Live attack title');
      // Unresolved, so the checkbox names it from the snapshot rather than going unlabelled.
      expect(rowCheckbox('so-2')).toHaveAccessibleName('Select Snapshotted attack title');
    });

    it('selects and deselects a single row', async () => {
      renderTab();

      expect(rowCheckbox('so-1')).not.toBeChecked();

      await userEvent.click(rowCheckbox('so-1'));
      expect(rowCheckbox('so-1')).toBeChecked();

      await userEvent.click(rowCheckbox('so-1'));
      expect(rowCheckbox('so-1')).not.toBeChecked();
    });

    it('reflects a partial selection in the header checkbox', async () => {
      renderAttachments(twoAttachments());

      await userEvent.click(rowCheckbox('so-1'));
      expect(selectAllCheckbox()).toBePartiallyChecked();

      await userEvent.click(rowCheckbox('so-2'));
      expect(selectAllCheckbox()).toBeChecked();
    });

    it('selects every filtered row, including the ones on a later page', async () => {
      renderTwelveAttachments();
      await showTenRowsPerPage();

      await userEvent.click(selectAllCheckbox());

      expect(rowCheckbox('so-0')).toBeChecked();

      await goToPage(2);

      expect(rowCheckbox('so-10')).toBeChecked();
      expect(rowCheckbox('so-11')).toBeChecked();
    });

    it('deselects every row when the header checkbox is cleared', async () => {
      renderAttachments(twoAttachments());

      await userEvent.click(selectAllCheckbox());
      await userEvent.click(selectAllCheckbox());

      expect(rowCheckbox('so-1')).not.toBeChecked();
      expect(rowCheckbox('so-2')).not.toBeChecked();
    });

    it('keeps the selection when navigating between pages', async () => {
      renderTwelveAttachments();
      await showTenRowsPerPage();

      await userEvent.click(rowCheckbox('so-0'));
      await goToPage(2);
      await goToPage(1);

      expect(rowCheckbox('so-0')).toBeChecked();
    });

    it('clears the selection when the page size changes', async () => {
      renderTwelveAttachments();

      await userEvent.click(rowCheckbox('so-0'));
      expect(rowCheckbox('so-0')).toBeChecked();

      await showTenRowsPerPage();

      expect(rowCheckbox('so-0')).not.toBeChecked();
    });

    it('clears the selection when the search term changes', async () => {
      const caseData = buildCaseData([buildAttachment()]);
      const { rerender } = render(
        <TestProviders>
          <AttackTabContent caseData={caseData} />
        </TestProviders>
      );

      await userEvent.click(rowCheckbox('so-1'));
      expect(rowCheckbox('so-1')).toBeChecked();

      rerender(
        <TestProviders>
          <AttackTabContent caseData={caseData} searchTerm="snapshotted" />
        </TestProviders>
      );

      expect(rowCheckbox('so-1')).not.toBeChecked();
    });
  });

  describe('the bulk action bar', () => {
    const rowCheckbox = (savedObjectId: string) =>
      screen.getByTestId(`${ATTACK_TAB_ROW_SELECT_TEST_ID}-${savedObjectId}`);

    /** Sorted by detection time, `so-1` is the live attack and `so-2` the unresolved one. */
    const renderTwoAttachments = () =>
      renderAttachments([
        buildAttachment(),
        buildAttachment({ id: 'so-2', attachmentId: 'attack-id-2' }),
      ]);

    const selectBothRows = async () => {
      await userEvent.click(rowCheckbox('so-1'));
      await userEvent.click(rowCheckbox('so-2'));
    };

    const openBulkRemovalPrompt = async () => {
      await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_REMOVE_TEST_ID));
    };

    const confirmRemoval = async () => {
      await userEvent.click(screen.getByText('Remove'));
    };

    it('stays hidden until a row is selected', () => {
      renderTwoAttachments();

      expect(screen.queryByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).not.toBeInTheDocument();
    });

    it('appears with the selection, and counts it', async () => {
      renderTwoAttachments();

      await userEvent.click(rowCheckbox('so-1'));
      expect(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).toHaveTextContent(
        '1 attack selected'
      );

      await userEvent.click(rowCheckbox('so-2'));
      expect(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).toHaveTextContent(
        '2 attacks selected'
      );
    });

    it('goes away again when the selection is cleared', async () => {
      renderTwoAttachments();

      await userEvent.click(rowCheckbox('so-1'));
      await userEvent.click(rowCheckbox('so-1'));

      expect(screen.queryByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).not.toBeInTheDocument();
    });

    it('resolves the related alerts across the whole selection', async () => {
      renderTwoAttachments();

      await selectBothRows();
      await openBulkRemovalPrompt();

      expect(useRemovableAlertAttachmentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ attackIds: ['attack-id-1', 'attack-id-2'] })
      );
    });

    it('removes every selected attack in one call rather than one per row', async () => {
      renderTwoAttachments();

      await selectBothRows();
      await openBulkRemovalPrompt();
      await confirmRemoval();

      expect(removeAttack).toHaveBeenCalledTimes(1);
      expect(removeAttack).toHaveBeenCalledWith(
        {
          caseId: 'case-1',
          attackAttachmentIds: ['so-1', 'so-2'],
          alertAttachmentIds: [],
        },
        expect.anything()
      );
    });

    it('takes the selection’s related alert attachments when the prompt opts in', async () => {
      renderTwoAttachments();

      await selectBothRows();
      await openBulkRemovalPrompt();
      await userEvent.click(screen.getByTestId(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID));
      await confirmRemoval();

      expect(removeAttack).toHaveBeenCalledWith(
        expect.objectContaining({ alertAttachmentIds: ['so-alert-1', 'so-alert-2'] }),
        expect.anything()
      );
    });

    it('clears the selection once the removal lands', async () => {
      removeAttack.mockImplementationOnce((_params, options) => options?.onSuccess?.());

      renderTwoAttachments();

      await selectBothRows();
      await openBulkRemovalPrompt();
      await confirmRemoval();

      expect(rowCheckbox('so-1')).not.toBeChecked();
      expect(rowCheckbox('so-2')).not.toBeChecked();
      expect(screen.queryByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).not.toBeInTheDocument();
    });

    it('keeps the selection when the removal does not land', async () => {
      renderTwoAttachments();

      await selectBothRows();
      await openBulkRemovalPrompt();
      await confirmRemoval();

      expect(rowCheckbox('so-1')).toBeChecked();
      expect(rowCheckbox('so-2')).toBeChecked();
    });

    it('disables the bulk action while a removal is in flight', async () => {
      useRemoveAttackAttachmentMock.mockReturnValue({ mutate: removeAttack, isLoading: true });

      renderTwoAttachments();

      await userEvent.click(rowCheckbox('so-1'));

      expect(screen.getByTestId(ATTACK_TAB_BULK_REMOVE_TEST_ID)).toBeDisabled();
    });
  });
});
