/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescribedFormGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { extractRulesCapabilities } from '../../../../common/utils/rules_capabilities';
import {
  fetchAlertAnalysisWorkflowRuleAttachments,
  fetchAlertAnalysisWorkflowRuleAttachmentSelection,
  fetchAlertAnalysisWorkflowRuleAttachmentStats,
  type RuleAttachmentPage,
  type RuleAttachmentSelection,
  type RuleAttachmentStats,
  type RuleAttachmentSummary,
  type UpdateRuleAttachmentsResult,
  updateAlertAnalysisWorkflowRuleAttachments,
} from './api';

const RULE_ATTACHMENTS_PER_PAGE = 5;

const RULE_ATTACHMENT_STATS_QUERY_KEY = [
  'alertAnalysisWorkflow',
  'alertAnalysisWorkflowRuleAttachmentStats',
] as const;

const RULE_ATTACHMENTS_QUERY_KEY = [
  'alertAnalysisWorkflow',
  'alertAnalysisWorkflowRuleAttachments',
] as const;

const RULE_ATTACHMENT_SELECTION_QUERY_KEY = [
  'alertAnalysisWorkflow',
  'alertAnalysisWorkflowRuleAttachmentSelection',
] as const;

type RuleAttachmentError = Error & { body?: { message?: string } };
type BulkSelectionAction = 'select' | 'deselect';

interface RuleAttachmentBulkSelection {
  query: string;
  attachedRuleIds: string[];
  ruleIds: string[];
}

const getErrorMessage = (error: RuleAttachmentError): string | undefined => {
  return error.body?.message ?? error.message;
};

const getShowingRulesRange = ({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}): { first: number; last: number } => {
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return { first, last };
};

export const AlertAnalysisWorkflowRuleAttachmentSection: React.FC = () => {
  const {
    services: { application, http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();
  const [ruleQuery, setRuleQuery] = useState('');
  const [appliedRuleQuery, setAppliedRuleQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(RULE_ATTACHMENTS_PER_PAGE);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [bulkSelection, setBulkSelection] = useState<RuleAttachmentBulkSelection | null>(null);
  const [confirmAction, setConfirmAction] = useState<'attach' | 'detach' | null>(null);
  const [isUpdatingRuleAttachments, setIsUpdatingRuleAttachments] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId();
  const normalizedRuleQuery = appliedRuleQuery.trim();

  // EuiBasicTable calls onSelectionChange([]) before onChange when the page/sort/size changes
  // (via its internal clearSelection). This ref captures selectedRuleIds as of the last render
  // so onTableChange can restore them, discarding that spurious callback.
  const selectedRuleIdsRef = useRef(selectedRuleIds);
  selectedRuleIdsRef.current = selectedRuleIds;
  const canEditRules = extractRulesCapabilities(application.capabilities).rules.edit;
  const selectedRulesCount = selectedRuleIds.length;
  const [isBulkActionsPopoverOpen, setIsBulkActionsPopoverOpen] = useState(false);
  const closeBulkActionsPopover = useCallback(() => setIsBulkActionsPopoverOpen(false), []);

  const showRuleAttachmentError = useCallback(
    (title: string, error: RuleAttachmentError) => {
      notifications.toasts.addDanger({
        title,
        text: getErrorMessage(error),
      });
    },
    [notifications.toasts]
  );

  const statsQuery = useQuery<RuleAttachmentStats, RuleAttachmentError>({
    queryKey: [...RULE_ATTACHMENT_STATS_QUERY_KEY, normalizedRuleQuery],
    retry: false,
    queryFn: async () => {
      return fetchAlertAnalysisWorkflowRuleAttachmentStats({
        http,
        search: normalizedRuleQuery,
      });
    },
    onError: (error) => {
      showRuleAttachmentError(
        i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentStatsErrorMessage',
          {
            defaultMessage: 'Failed to preview matching detection rules',
          }
        ),
        error
      );
    },
  });

  const ruleAttachmentsQuery = useQuery<RuleAttachmentPage, RuleAttachmentError>({
    queryKey: [...RULE_ATTACHMENTS_QUERY_KEY, normalizedRuleQuery, page, perPage],
    enabled: statsQuery.isSuccess,
    keepPreviousData: true,
    retry: false,
    queryFn: async () => {
      return fetchAlertAnalysisWorkflowRuleAttachments({
        http,
        search: normalizedRuleQuery,
        page,
        perPage,
      });
    },
    onError: (error) => {
      showRuleAttachmentError(
        i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentListErrorMessage',
          {
            defaultMessage: 'Failed to load matching detection rules',
          }
        ),
        error
      );
    },
  });

  const bulkSelectionMutation = useMutation<
    RuleAttachmentSelection,
    RuleAttachmentError,
    { action: BulkSelectionAction; query: string }
  >({
    mutationKey: [...RULE_ATTACHMENT_SELECTION_QUERY_KEY, normalizedRuleQuery],
    // Take the query as a mutation variable rather than closing over normalizedRuleQuery: react-query
    // rebinds onSuccess to the latest render's options even while a mutation is in flight, so a
    // closed-over value would reflect a search the user typed after clicking this button, not the
    // one the fetch below actually ran against.
    mutationFn: async ({ query }) => {
      return fetchAlertAnalysisWorkflowRuleAttachmentSelection({ http, search: query });
    },
    onSuccess: ({ attachedRuleIds, ruleIds }, { action, query }) => {
      setBulkSelection({ query, attachedRuleIds, ruleIds });

      setSelectedRuleIds(action === 'select' ? [...new Set([...attachedRuleIds, ...ruleIds])] : []);
    },
    onError: (error) => {
      showRuleAttachmentError(
        i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentSelectionErrorMessage',
          {
            defaultMessage: 'Failed to select matching detection rules',
          }
        ),
        error
      );
    },
  });

  const updateMutation = useMutation<
    UpdateRuleAttachmentsResult,
    RuleAttachmentError,
    'attach' | 'detach'
  >({
    mutationFn: async (action) => {
      return updateAlertAnalysisWorkflowRuleAttachments({
        http,
        attachRuleIds: action === 'attach' ? selectedRuleIds : [],
        detachRuleIds: action === 'detach' ? selectedRuleIds : [],
      });
    },
    onSuccess: (response: UpdateRuleAttachmentsResult) => {
      setConfirmAction(null);
      setSelectedRuleIds([]);
      setBulkSelection(null);
      // Refetch from the server rather than patching the caches optimistically: in the pure
      // selection model a selected rule may already be in the target state, so the client can't
      // compute the resulting attached/selectable counts precisely (it only knows attach state
      // for the current page). Invalidate all three queries so they reflect the real state.
      queryClient.invalidateQueries({ queryKey: RULE_ATTACHMENT_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RULE_ATTACHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RULE_ATTACHMENT_SELECTION_QUERY_KEY });
      notifications.toasts.addSuccess(
        i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentSuccessMessage',
          {
            defaultMessage:
              'Updated alert analysis workflow on {updated, plural, one {# rule} other {# rules}}.',
            values: { updated: response.updated },
          }
        )
      );
    },
    onError: (error) => {
      showRuleAttachmentError(
        i18n.translate('xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentErrorMessage', {
          defaultMessage: 'Failed to update alert analysis workflow on detection rules',
        }),
        error
      );
    },
    onSettled: () => {
      setIsUpdatingRuleAttachments(false);
    },
  });

  const hasRuleAttachmentError = statsQuery.isError || ruleAttachmentsQuery.isError;
  const stats = hasRuleAttachmentError ? undefined : statsQuery.data ?? ruleAttachmentsQuery.data;
  const totalRules = stats?.total ?? 0;
  const isLoadingPreview =
    !hasRuleAttachmentError && (statsQuery.isLoading || ruleAttachmentsQuery.isFetching);
  const pageRules = useMemo(
    () => (hasRuleAttachmentError ? [] : ruleAttachmentsQuery.data?.rules ?? []),
    [hasRuleAttachmentError, ruleAttachmentsQuery.data?.rules]
  );
  const selectedRuleIdsSet = useMemo(() => new Set(selectedRuleIds), [selectedRuleIds]);
  // EuiBasicTable only accepts `selected` items that are also in the current page's `items`, and
  // calls onSelectionChange to correct anything else — so the visible selection must be scoped to
  // the current page even though selectedRuleIds itself can span every matching page.
  const selectedPageItems = useMemo(
    () => pageRules.filter((rule) => selectedRuleIdsSet.has(rule.id)),
    [pageRules, selectedRuleIdsSet]
  );
  const isCurrentBulkSelectionAllSelected = useMemo(() => {
    if (!bulkSelection || bulkSelection.query !== normalizedRuleQuery) {
      return false;
    }

    return [...bulkSelection.attachedRuleIds, ...bulkSelection.ruleIds].every((ruleId) =>
      selectedRuleIdsSet.has(ruleId)
    );
  }, [bulkSelection, normalizedRuleQuery, selectedRuleIdsSet]);
  const isCurrentPageAllSelected = useMemo(
    () =>
      totalRules > 0 &&
      totalRules === pageRules.length &&
      pageRules.every((rule) => selectedRuleIdsSet.has(rule.id)),
    [pageRules, selectedRuleIdsSet, totalRules]
  );
  const isAllMatchingRulesSelected = isCurrentBulkSelectionAllSelected || isCurrentPageAllSelected;
  const bulkSelectionButtonAction: BulkSelectionAction = isAllMatchingRulesSelected
    ? 'deselect'
    : 'select';
  const bulkSelectionButtonDisabled =
    !canEditRules || totalRules === 0 || statsQuery.isLoading || hasRuleAttachmentError;
  const { first: firstRuleOnPage, last: lastRuleOnPage } = getShowingRulesRange({
    page,
    perPage,
    total: totalRules,
  });

  const columns: Array<EuiBasicTableColumn<RuleAttachmentSummary>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentRuleNameColumnLabel',
          {
            defaultMessage: 'Rule',
          }
        ),
        render: (name: string) => <EuiText size="s">{name}</EuiText>,
      },
      {
        field: 'enabled',
        name: i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentEnabledColumnLabel',
          {
            defaultMessage: 'Rule state',
          }
        ),
        width: '120px',
        render: (enabled: boolean) =>
          enabled ? (
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentEnabledBadgeLabel"
                defaultMessage="Enabled"
              />
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentDisabledBadgeLabel"
                defaultMessage="Disabled"
              />
            </EuiBadge>
          ),
      },
      {
        field: 'attached',
        name: i18n.translate(
          'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentWorkflowActionColumnLabel',
          {
            defaultMessage: 'Workflow action',
          }
        ),
        width: '140px',
        render: (attached: boolean) =>
          attached ? (
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentAttachedBadgeLabel"
                defaultMessage="Attached"
              />
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentNotAttachedBadgeLabel"
                defaultMessage="Not attached"
              />
            </EuiBadge>
          ),
      },
    ],
    []
  );

  const onTableChange = useCallback(
    ({ page: tablePage }: CriteriaWithPagination<RuleAttachmentSummary>) => {
      if (tablePage) {
        // EuiBasicTable.onPageChange calls clearSelection() → onSelectionChange([]) before
        // calling onChange, so by the time we get here the selection has been corrupted.
        // Restore it from the ref, which holds its value as of the last render.
        setSelectedRuleIds(selectedRuleIdsRef.current);
        setPage(tablePage.index + 1);
        setPerPage(tablePage.size);
      }
    },
    []
  );

  const applyRuleQuery = useCallback((query: string) => {
    setAppliedRuleQuery(query.trim());
    setBulkSelection(null);
    setPage(1);
  }, []);

  const onRuleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextQuery = event.target.value;
      setRuleQuery(nextQuery);

      if (nextQuery.trim() === '') {
        applyRuleQuery('');
      }
    },
    [applyRuleQuery]
  );

  const onRuleQueryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        applyRuleQuery(event.currentTarget.value);
      }
    },
    [applyRuleQuery]
  );

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentTitle"
            defaultMessage="Detection rules"
          />
        </h4>
      }
      description={
        <p>
          <FormattedMessage
            id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentDescription"
            defaultMessage="Select the detection rules that should run the managed alert analysis workflow. Existing workflow attachments are shown before you apply changes."
          />
        </p>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentFilterQueryLabel',
              {
                defaultMessage: 'Rule filter',
              }
            )}
            helpText={i18n.translate(
              'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentFilterQueryHelpText',
              {
                defaultMessage:
                  'Search by rule name. Press Enter to apply. Leave empty to show every rule.',
              }
            )}
          >
            <EuiFieldSearch
              fullWidth
              data-test-subj="alertAnalysisWorkflowRuleAttachmentQuery"
              value={ruleQuery}
              placeholder={i18n.translate(
                'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentFilterQueryPlaceholder',
                {
                  defaultMessage: 'Search by rule name',
                }
              )}
              onChange={onRuleQueryChange}
              onKeyDown={onRuleQueryKeyDown}
              onSearch={applyRuleQuery}
              isClearable
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            justifyContent="spaceBetween"
            responsive={false}
            wrap
          >
            <EuiFlexItem grow>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText
                    color="subdued"
                    size="s"
                    data-test-subj="alertAnalysisWorkflowRuleAttachmentShowingRules"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentShowingRulesLabel"
                      defaultMessage="Showing {firstRuleOnPage}-{lastRuleOnPage} of {totalRules} rules"
                      values={{ firstRuleOnPage, lastRuleOnPage, totalRules }}
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    color="subdued"
                    size="s"
                    data-test-subj="alertAnalysisWorkflowRuleAttachmentSelectedRules"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentSelectedRulesLabel"
                      defaultMessage="Selected {selectedRulesCount, plural, one {# rule} other {# rules}}"
                      values={{ selectedRulesCount }}
                    />
                  </EuiText>
                </EuiFlexItem>
                {canEditRules && selectedRulesCount > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      data-test-subj="alertAnalysisWorkflowRuleAttachmentBulkActionsPopover"
                      isOpen={isBulkActionsPopoverOpen}
                      closePopover={closeBulkActionsPopover}
                      panelPaddingSize="none"
                      button={
                        <EuiButtonEmpty
                          data-test-subj="alertAnalysisWorkflowRuleAttachmentBulkActionsButton"
                          size="s"
                          iconSide="right"
                          iconType="arrowDown"
                          flush="left"
                          isLoading={updateMutation.isLoading}
                          onClick={() => setIsBulkActionsPopoverOpen((isOpen) => !isOpen)}
                        >
                          <FormattedMessage
                            id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentBulkActionsButtonLabel"
                            defaultMessage="Bulk actions"
                          />
                        </EuiButtonEmpty>
                      }
                    >
                      <EuiContextMenuPanel
                        items={[
                          <EuiContextMenuItem
                            key="attach"
                            icon="plusInCircle"
                            data-test-subj="alertAnalysisWorkflowRuleAttachmentAttachAction"
                            onClick={() => {
                              closeBulkActionsPopover();
                              setConfirmAction('attach');
                            }}
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentAttachWorkflowActionLabel"
                              defaultMessage="Attach workflow"
                            />
                          </EuiContextMenuItem>,
                          <EuiContextMenuItem
                            key="detach"
                            icon="minusInCircle"
                            data-test-subj="alertAnalysisWorkflowRuleAttachmentRemoveAction"
                            onClick={() => {
                              closeBulkActionsPopover();
                              setConfirmAction('detach');
                            }}
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentRemoveWorkflowActionLabel"
                              defaultMessage="Remove workflow"
                            />
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="alertAnalysisWorkflowRuleAttachmentSelectAllButton"
                    disabled={bulkSelectionButtonDisabled}
                    iconType="pagesSelect"
                    isLoading={bulkSelectionMutation.isLoading}
                    onClick={() =>
                      bulkSelectionMutation.mutate({
                        action: bulkSelectionButtonAction,
                        query: normalizedRuleQuery,
                      })
                    }
                    size="s"
                  >
                    {bulkSelectionButtonAction === 'select' ? (
                      <FormattedMessage
                        id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentSelectAllButtonLabel"
                        defaultMessage="Select all {totalRules, plural, one {# rule} other {# rules}}"
                        values={{ totalRules }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentDeselectAllButtonLabel"
                        defaultMessage="Deselect all"
                      />
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="alertAnalysisWorkflowRuleAttachmentClearSelectionButton"
                    disabled={selectedRulesCount === 0}
                    iconType="cross"
                    onClick={() => {
                      setSelectedRuleIds([]);
                      setBulkSelection(null);
                    }}
                    size="s"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentClearSelectionButtonLabel"
                      defaultMessage="Clear selection"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
          <EuiBasicTable
            compressed
            data-test-subj="alertAnalysisWorkflowRuleAttachmentTable"
            itemId="id"
            items={pageRules}
            columns={columns}
            loading={isLoadingPreview}
            onChange={onTableChange}
            pagination={{
              pageIndex: page - 1,
              pageSize: perPage,
              pageSizeOptions: [5, 10, 20],
              totalItemCount: hasRuleAttachmentError
                ? 0
                : ruleAttachmentsQuery.data?.total ?? totalRules,
            }}
            tableCaption={i18n.translate(
              'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentTableCaption',
              {
                defaultMessage: 'Detection rules matching the alert analysis workflow filter',
              }
            )}
            selection={{
              selectable: () => canEditRules,
              onSelectionChange: (selectedRules: RuleAttachmentSummary[]) => {
                // Only merge the CURRENT page's checked state into selectedRuleIds, leaving any
                // ids selected on other pages (e.g. via "Select all") untouched.
                const selectedPageRuleIds = new Set(selectedRules.map(({ id }) => id));

                setSelectedRuleIds((currentSelectedRuleIds) => {
                  const nextSelectedRuleIds = new Set(currentSelectedRuleIds);

                  pageRules.forEach(({ id }) => {
                    if (selectedPageRuleIds.has(id)) {
                      nextSelectedRuleIds.add(id);
                    } else {
                      nextSelectedRuleIds.delete(id);
                    }
                  });

                  return [...nextSelectedRuleIds];
                });
              },
              selected: selectedPageItems,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {confirmAction && (
        <EuiConfirmModal
          data-test-subj="alertAnalysisWorkflowRuleAttachmentConfirmModal"
          aria-labelledby={confirmModalTitleId}
          title={
            confirmAction === 'attach'
              ? i18n.translate(
                  'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalAttachTitle',
                  { defaultMessage: 'Attach the workflow?' }
                )
              : i18n.translate(
                  'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalDetachTitle',
                  { defaultMessage: 'Remove the workflow?' }
                )
          }
          titleProps={{ id: confirmModalTitleId }}
          onCancel={() => {
            if (!isUpdatingRuleAttachments) {
              setConfirmAction(null);
            }
          }}
          onConfirm={() => {
            setIsUpdatingRuleAttachments(true);
            updateMutation.mutate(confirmAction);
          }}
          cancelButtonText={i18n.translate(
            'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalCancelButtonLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={
            confirmAction === 'attach'
              ? i18n.translate(
                  'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalAttachConfirmButtonLabel',
                  {
                    defaultMessage:
                      'Attach workflow to {selectedRulesCount, plural, one {# rule} other {# rules}}',
                    values: { selectedRulesCount },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalDetachConfirmButtonLabel',
                  {
                    defaultMessage:
                      'Remove workflow from {selectedRulesCount, plural, one {# rule} other {# rules}}',
                    values: { selectedRulesCount },
                  }
                )
          }
          buttonColor={confirmAction === 'attach' ? 'primary' : 'warning'}
          defaultFocusedButton="confirm"
          confirmButtonDisabled={isUpdatingRuleAttachments}
          isLoading={isUpdatingRuleAttachments}
        >
          <EuiText size="s">
            <p>
              {confirmAction === 'attach' ? (
                <FormattedMessage
                  id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalAttachDescription"
                  defaultMessage="This will attach the alert analysis workflow to {selectedRulesCount, plural, one {# rule} other {# rules}}."
                  values={{ selectedRulesCount }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalDetachDescription"
                  defaultMessage="This will remove the alert analysis workflow from {selectedRulesCount, plural, one {# rule} other {# rules}}."
                  values={{ selectedRulesCount }}
                />
              )}
            </p>
            {isUpdatingRuleAttachments && (
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                data-test-subj="alertAnalysisWorkflowRuleAttachmentUpdatingIndicator"
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentConfirmModalLoadingLabel"
                    defaultMessage="Updating rule attachments..."
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiText>
        </EuiConfirmModal>
      )}
      <EuiSpacer size="s" />
    </EuiDescribedFormGroup>
  );
};
