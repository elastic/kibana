/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rules management page.
 *
 * Lists all detection rules via GET /api/detection_engine/v2/rules.
 * Columns: name, type, severity, risk score, tags, enabled.
 * Filters: enabled status, type, severity, tags, free-text search.
 * Sort: name, enabled, risk_score only (severity excluded by design).
 * Row actions: enable/disable toggle, delete.
 *
 * Ref: poc-requirements.md, rule-fetch-api.md
 */

import React, { useState, useCallback } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type Criteria,
  type EuiBasicTableColumn,
  type EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DetectionRuleResponse,
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
} from '../../../common/api';
import {
  useDetectionRules,
  useEnableRule,
  useDisableRule,
  useDeleteRule,
  useCreateRule,
  useUpdateRule,
} from './use_detection_rules';
import type { ListRulesParams } from '../../services/detection_rules_api';
import {
  DetectionRuleForm,
  defaultFormState,
  formStateFromRule,
  assembleCreatePayload,
  assembleUpdatePayload,
  validatePayload,
} from './detection_rule_form';
import type { DetectionRuleFormState, FieldErrors } from './detection_rule_form';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = 'name' | 'enabled' | 'risk_score';
type SortDirection = 'asc' | 'desc';

/** Filter state for the page. */
interface RuleFilters {
  search: string;
  enabledFilter: 'all' | 'enabled' | 'disabled';
  typeFilter: 'all' | 'query' | 'threshold';
  severityFilter: 'all' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * UI mode for the page.
 *
 * - `list`: the normal rules table
 * - `create`: the form for creating a new rule
 * - `edit`: the form pre-populated for editing an existing rule
 */
type PageMode =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'edit'; rule: DetectionRuleResponse };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const DEFAULT_PAGE_SIZE = 20;

/** Maps page filter state to the API's ListRulesParams. */
const filtersToParams = (
  filters: RuleFilters,
  sort: { field: SortField; direction: SortDirection },
  page: number,
  perPage: number
): ListRulesParams => {
  const params: ListRulesParams = {
    sort_field: sort.field,
    sort_order: sort.direction,
    page,
    per_page: perPage,
  };

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.enabledFilter !== 'all') {
    params.enabled = filters.enabledFilter === 'enabled';
  }
  if (filters.typeFilter !== 'all') {
    params.type = [filters.typeFilter];
  }
  if (filters.severityFilter !== 'all') {
    params.severity = [filters.severityFilter];
  }

  return params;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DetectionRulesPage: React.FC = () => {
  // --- Page mode: list | create | edit ---
  const [mode, setMode] = useState<PageMode>({ kind: 'list' });

  // --- Form state (shared across create and edit modes) ---
  const [formState, setFormState] = useState<DetectionRuleFormState>(defaultFormState());
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  // --- Filter state ---
  const [filters, setFilters] = useState<RuleFilters>({
    search: '',
    enabledFilter: 'all',
    typeFilter: 'all',
    severityFilter: 'all',
  });

  // --- Sort state (severity is not sortable) ---
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'name',
    direction: 'asc',
  });

  // --- Pagination state ---
  const [page, setPage] = useState(1);
  const [perPage] = useState(DEFAULT_PAGE_SIZE);

  const queryParams = filtersToParams(filters, sort, page, perPage);

  // --- Data fetching ---
  const { data, isFetching, isError } = useDetectionRules(queryParams);
  const enableMutation = useEnableRule();
  const disableMutation = useDisableRule();
  const deleteMutation = useDeleteRule();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();

  // Track which rule's toggle is in-flight to show a spinner.
  const togglingId =
    (enableMutation.isLoading && enableMutation.variables) ||
    (disableMutation.isLoading && disableMutation.variables) ||
    null;

  // --- Callbacks ---
  const handleToggleEnabled = useCallback(
    (rule: DetectionRuleResponse) => {
      if (rule.enabled) {
        disableMutation.mutate(rule.id);
      } else {
        enableMutation.mutate(rule.id);
      }
    },
    [enableMutation, disableMutation]
  );

  const handleDelete = useCallback(
    (rule: DetectionRuleResponse) => {
      // A real UI would show a confirmation modal; as a POC we delete directly.
      deleteMutation.mutate(rule.id);
    },
    [deleteMutation]
  );

  // --- Form callbacks ---

  const handleCreateClick = useCallback(() => {
    setFormState(defaultFormState());
    setFormErrors({});
    setFormSubmitError(null);
    setMode({ kind: 'create' });
  }, []);

  const handleEditClick = useCallback((rule: DetectionRuleResponse) => {
    setFormState(formStateFromRule(rule));
    setFormErrors({});
    setFormSubmitError(null);
    setMode({ kind: 'edit', rule });
  }, []);

  const handleFormCancel = useCallback(() => {
    setMode({ kind: 'list' });
  }, []);

  const handleFormSubmit = useCallback(() => {
    if (mode.kind === 'create') {
      const payload = assembleCreatePayload(formState);
      const errors = validatePayload(payload, 'create');
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      setFormErrors({});
      createMutation.mutate(payload as DetectionRuleCreateProps, {
        onSuccess: () => {
          setMode({ kind: 'list' });
          setFormSubmitError(null);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setFormSubmitError(msg);
        },
      });
    } else if (mode.kind === 'edit') {
      const payload = assembleUpdatePayload(formState, mode.rule);
      const errors = validatePayload(payload, 'edit');
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      setFormErrors({});
      updateMutation.mutate(
        { id: mode.rule.id, props: payload as DetectionRuleUpdateProps },
        {
          onSuccess: () => {
            setMode({ kind: 'list' });
            setFormSubmitError(null);
          },
          onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setFormSubmitError(msg);
          },
        }
      );
    }
  }, [mode, formState, createMutation, updateMutation]);

  const handleTableChange = useCallback(
    ({ page: tablePage, sort: tableSort }: Criteria<DetectionRuleResponse>) => {
      if (tableSort) {
        const nextField = tableSort.field as SortField;
        // Only accept the three sortable fields.
        if (nextField === 'name' || nextField === 'enabled' || nextField === 'risk_score') {
          setSort({ field: nextField, direction: tableSort.direction });
          setPage(1);
          return;
        }
      }
      if (tablePage) {
        setPage(tablePage.index + 1);
      }
    },
    []
  );

  // --- Columns ---
  const columns: Array<EuiBasicTableColumn<DetectionRuleResponse>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.securityDetections.rulesList.column.name', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.securityDetections.rulesList.column.type', {
        defaultMessage: 'Type',
      }),
      width: '10%',
      render: (type: string) => (
        <EuiBadge color="hollow" data-test-subj="ruleTypeCell">
          {type}
        </EuiBadge>
      ),
    },
    {
      field: 'severity',
      name: i18n.translate('xpack.securityDetections.rulesList.column.severity', {
        defaultMessage: 'Severity',
      }),
      width: '10%',
      // Severity is intentionally not sortable: lexicographic ordering is
      // meaningless for low < medium < high < critical.
      sortable: false,
      render: (severity: string) => (
        <EuiBadge color={SEVERITY_COLORS[severity] ?? 'default'} data-test-subj="ruleSeverityCell">
          {severity}
        </EuiBadge>
      ),
    },
    {
      field: 'risk_score',
      name: i18n.translate('xpack.securityDetections.rulesList.column.riskScore', {
        defaultMessage: 'Risk score',
      }),
      width: '10%',
      sortable: true,
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.securityDetections.rulesList.column.tags', {
        defaultMessage: 'Tags',
      }),
      width: '20%',
      render: (tags: string[]) => {
        if (!tags || tags.length === 0) {
          return <span>—</span>;
        }
        return (
          <EuiBadgeGroup gutterSize="xs" data-test-subj="ruleTagsCell">
            {tags.slice(0, 3).map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
            {tags.length > 3 && (
              <EuiToolTip content={tags.slice(3).join(', ')}>
                <EuiBadge color="hollow" tabIndex={0}>
                  +{tags.length - 3}
                </EuiBadge>
              </EuiToolTip>
            )}
          </EuiBadgeGroup>
        );
      },
    },
    {
      field: 'enabled',
      name: i18n.translate('xpack.securityDetections.rulesList.column.enabled', {
        defaultMessage: 'Enabled',
      }),
      width: '9%',
      sortable: true,
      render: (enabled: boolean, rule: DetectionRuleResponse) => {
        if (togglingId === rule.id) {
          return <EuiLoadingSpinner size="m" data-test-subj={`ruleEnabledSpinner-${rule.id}`} />;
        }
        return (
          <EuiSwitch
            compressed
            showLabel={false}
            label={i18n.translate('xpack.securityDetections.rulesList.toggle.label', {
              defaultMessage: '{state} rule "{name}"',
              values: {
                state: enabled ? 'Disable' : 'Enable',
                name: rule.name,
              },
            })}
            checked={enabled}
            disabled={Boolean(togglingId)}
            onChange={() => handleToggleEnabled(rule)}
            data-test-subj={`ruleEnabledSwitch-${rule.id}`}
          />
        );
      },
    },
    {
      name: i18n.translate('xpack.securityDetections.rulesList.column.actions', {
        defaultMessage: 'Actions',
      }),
      width: '12%',
      align: 'right',
      render: (rule: DetectionRuleResponse) => (
        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.securityDetections.rulesList.action.edit', {
                defaultMessage: 'Edit rule',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="pencil"
                aria-label={i18n.translate('xpack.securityDetections.rulesList.action.edit', {
                  defaultMessage: 'Edit rule',
                })}
                onClick={() => handleEditClick(rule)}
                data-test-subj={`editRule-${rule.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.securityDetections.rulesList.action.delete', {
                defaultMessage: 'Delete rule',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                aria-label={i18n.translate('xpack.securityDetections.rulesList.action.delete', {
                  defaultMessage: 'Delete rule',
                })}
                onClick={() => handleDelete(rule)}
                isLoading={deleteMutation.isLoading && deleteMutation.variables === rule.id}
                data-test-subj={`deleteRule-${rule.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  // --- Table sort descriptor ---
  const sorting: EuiTableSortingType<DetectionRuleResponse> = {
    sort: {
      field: sort.field as keyof DetectionRuleResponse,
      direction: sort.direction,
    },
    enableAllColumns: false,
  };

  const pagination = {
    pageIndex: page - 1,
    pageSize: perPage,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 20, 50],
  };

  const items = data?.data ?? [];

  const isFormSubmitting =
    (mode.kind === 'create' && createMutation.isLoading) ||
    (mode.kind === 'edit' && updateMutation.isLoading);

  // --- Render ---
  return (
    <div data-test-subj="detectionRulesPage">
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.securityDetections.rulesList.pageTitle', {
          defaultMessage: 'Detection Rules',
        })}
        description={i18n.translate('xpack.securityDetections.rulesList.pageDescription', {
          defaultMessage: 'Manage detection rules powered by Alerting v2.',
        })}
        rightSideItems={
          mode.kind === 'list'
            ? [
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  onClick={handleCreateClick}
                  data-test-subj="createRuleButton"
                >
                  {i18n.translate('xpack.securityDetections.rulesList.createButton', {
                    defaultMessage: 'Create rule',
                  })}
                </EuiButton>,
              ]
            : []
        }
        data-test-subj="detectionRulesPageHeader"
      />

      {/* Create / edit form */}
      {mode.kind !== 'list' && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder data-test-subj="detectionRuleFormPanel">
            <EuiTitle size="s">
              <h2>
                {mode.kind === 'create'
                  ? i18n.translate('xpack.securityDetections.ruleForm.createTitle', {
                      defaultMessage: 'Create detection rule',
                    })
                  : i18n.translate('xpack.securityDetections.ruleForm.editTitle', {
                      defaultMessage: 'Edit detection rule',
                    })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <DetectionRuleForm
              ruleToEdit={mode.kind === 'edit' ? mode.rule : undefined}
              formState={formState}
              errors={formErrors}
              isSubmitting={isFormSubmitting}
              submitError={formSubmitError}
              onChange={setFormState}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </EuiPanel>
          <EuiSpacer size="l" />
        </>
      )}

      {isError && (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.securityDetections.rulesList.errorTitle', {
            defaultMessage: 'Error loading detection rules',
          })}
          color="danger"
          iconType="warning"
          data-test-subj="detectionRulesError"
        />
      )}

      {/* Filters */}
      <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="detectionRulesFilters">
        <EuiFlexItem grow={3}>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.securityDetections.rulesList.searchPlaceholder', {
              defaultMessage: 'Search rules…',
            })}
            value={filters.search}
            onChange={(e) => {
              setFilters((f) => ({ ...f, search: e.target.value }));
              setPage(1);
            }}
            isClearable
            data-test-subj="detectionRulesSearchInput"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiSelect
            options={[
              { value: 'all', text: 'All statuses' },
              { value: 'enabled', text: 'Enabled' },
              { value: 'disabled', text: 'Disabled' },
            ]}
            value={filters.enabledFilter}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                enabledFilter: e.target.value as RuleFilters['enabledFilter'],
              }));
              setPage(1);
            }}
            aria-label={i18n.translate('xpack.securityDetections.rulesList.filter.status', {
              defaultMessage: 'Filter by status',
            })}
            data-test-subj="detectionRulesStatusFilter"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiSelect
            options={[
              { value: 'all', text: 'All types' },
              { value: 'query', text: 'Query' },
              { value: 'threshold', text: 'Threshold' },
            ]}
            value={filters.typeFilter}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                typeFilter: e.target.value as RuleFilters['typeFilter'],
              }));
              setPage(1);
            }}
            aria-label={i18n.translate('xpack.securityDetections.rulesList.filter.type', {
              defaultMessage: 'Filter by type',
            })}
            data-test-subj="detectionRulesTypeFilter"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiSelect
            options={[
              { value: 'all', text: 'All severities' },
              { value: 'low', text: 'Low' },
              { value: 'medium', text: 'Medium' },
              { value: 'high', text: 'High' },
              { value: 'critical', text: 'Critical' },
            ]}
            value={filters.severityFilter}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                severityFilter: e.target.value as RuleFilters['severityFilter'],
              }));
              setPage(1);
            }}
            aria-label={i18n.translate('xpack.securityDetections.rulesList.filter.severity', {
              defaultMessage: 'Filter by severity',
            })}
            data-test-subj="detectionRulesSeverityFilter"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={() => {
              setFilters({
                search: '',
                enabledFilter: 'all',
                typeFilter: 'all',
                severityFilter: 'all',
              });
              setPage(1);
            }}
            data-test-subj="detectionRulesClearFilters"
          >
            {i18n.translate('xpack.securityDetections.rulesList.filter.clear', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Table */}
      <EuiText size="xs" data-test-subj="detectionRulesTotal">
        <p>
          {i18n.translate('xpack.securityDetections.rulesList.showingTotal', {
            defaultMessage: '{count, plural, one {# rule} other {# rules}}',
            values: { count: data?.total ?? 0 },
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiBasicTable<DetectionRuleResponse>
        items={items}
        itemId="id"
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        loading={isFetching}
        onChange={handleTableChange}
        noItemsMessage={
          isFetching
            ? i18n.translate('xpack.securityDetections.rulesList.loading', {
                defaultMessage: 'Loading rules…',
              })
            : i18n.translate('xpack.securityDetections.rulesList.noRules', {
                defaultMessage: 'No detection rules found.',
              })
        }
        tableCaption={i18n.translate('xpack.securityDetections.rulesList.tableCaption', {
          defaultMessage: 'Detection rules',
        })}
        data-test-subj="detectionRulesTable"
      />
    </div>
  );
};
