/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiAccordion,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFilterButton,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface CategoryData<T = unknown> {
  category: string;
  items: T[];
}

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

/**
 * Props for the CategoryAccordionTable component.
 *
 * @example
 * ```tsx
 * // 1. Define your data type with computed fields
 * interface MyItem {
 *   name: string;
 *   status: 'active' | 'inactive';
 *   count: number;
 * }
 *
 * // 2. Prepare your categories with computed fields
 * const categories = rawData.map(cat => ({
 *   category: cat.name,
 *   items: cat.items.map(item => ({
 *     ...item,
 *     status: item.count > 0 ? 'active' : 'inactive', // Add computed field
 *   }))
 * }));
 *
 * // 3. Define columns (using field names from your data)
 * const columns = [
 *   { field: 'name', name: 'Name', sortable: true },
 *   { field: 'count', name: 'Count', sortable: true },
 *   { field: 'status', name: 'Status', render: (status) => <Badge>{status}</Badge> },
 * ];
 *
 * // 4. Create render function for accordion badges
 * const renderExtraAction = (category) => (
 *   <EuiFlexGroup gutterSize="s">
 *     <EuiBadge>{category.items.length} items</EuiBadge>
 *   </EuiFlexGroup>
 * );
 *
 * // 5. Use the component
 * <CategoryAccordionTable
 *   categories={categories}
 *   columns={columns}
 *   renderExtraAction={renderExtraAction}
 *   searchField="name"           // Field to search in
 *   filterField="status"         // Field to filter by
 *   filterOptions={[
 *     { value: 'all', label: 'All' },
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' },
 *   ]}
 *   itemName="items"
 * />
 * ```
 */
export interface CategoryAccordionTableProps<
  T extends Record<string, unknown> = Record<string, unknown>
> {
  /**
   * Array of categories with their items.
   * Each item should contain all the data needed to render the table columns,
   * including any computed fields referenced in the columns configuration.
   *
   * @example
   * ```ts
   * [
   *   {
   *     category: 'Endpoint',
   *     items: [
   *       { name: 'logs-endpoint.events', status: 'healthy', count: 100 },
   *       { name: 'logs-endpoint.alerts', status: 'incompatible', count: 50 }
   *     ]
   *   },
   *   {
   *     category: 'Network',
   *     items: [
   *       { name: 'logs-network.flow', status: 'healthy', count: 200 }
   *     ]
   *   }
   * ]
   * ```
   */
  categories: Array<CategoryData<T>>;
  /** Table columns configuration */
  columns: Array<EuiBasicTableColumn<T>>;
  /** Render function for accordion extra action (the right side with status/badges) */
  renderExtraAction: (category: CategoryData<T>) => React.ReactNode;
  /** Field name or path to use for search (e.g., 'indexName' or 'user.name') */
  searchField: string;
  /** Field name or path that contains the filter status value (e.g., 'status') - if not provided, filtering is disabled */
  filterField?: string;
  /** Search placeholder text. Default: "Search..." */
  searchPlaceholder?: string;
  /** Filter options */
  filterOptions?: FilterOption[];
  /** Default filter value. Default: "all" */
  defaultFilterValue?: string;
  /** Item name for counter display (e.g., 'indices', 'pipelines'). Default: "items" */
  itemName?: string;
  /** Initial page size for pagination. Default: 10 */
  initialPageSize?: number;
  /** Page size options. Default: [5, 10, 20] */
  pageSizeOptions?: number[];
  /** Default sort field */
  defaultSortField?: string;
  /** Default sort direction. Default: "asc" */
  defaultSortDirection?: 'asc' | 'desc';
}

export const CategoryAccordionTable = <T extends Record<string, unknown>>({
  categories,
  columns,
  renderExtraAction,
  searchField,
  filterField,
  searchPlaceholder = i18n.translate(
    'xpack.securitySolution.siemReadiness.categoryTable.defaultSearchPlaceholder',
    {
      defaultMessage: 'Search...',
    }
  ),
  filterOptions = [],
  defaultFilterValue = 'all',
  itemName = i18n.translate('xpack.securitySolution.siemReadiness.categoryTable.defaultItemName', {
    defaultMessage: 'items',
  }),
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20],
  defaultSortField,
  defaultSortDirection = 'asc',
}: CategoryAccordionTableProps<T>) => {
  const { euiTheme } = useEuiTheme();

  // Track which accordions are open
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState(defaultFilterValue);

  const toggleAccordion = (catName: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Helper to get nested field value from object
  const getFieldValue = useCallback((obj: T, fieldPath: string): string => {
    const keys = fieldPath.split('.');
    let value: unknown = obj;
    for (const key of keys) {
      value = (value as Record<string, unknown>)?.[key];
      if (value === undefined || value === null) return '';
    }
    return String(value);
  }, []);

  // Filter categories based on search query and filter value
  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          // Search filter - search in the specified field
          const searchableText = getFieldValue(item, searchField);
          const matchesSearch = searchQuery
            ? searchableText.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

          // Status filter - check the filter field value
          const matchesFilter =
            !filterField || filterValue === 'all'
              ? true
              : getFieldValue(item, filterField) === filterValue;

          return matchesSearch && matchesFilter;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, searchQuery, filterValue, searchField, filterField, getFieldValue]);

  // Calculate total counts for display
  const totalItemsCount = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalCategoriesCount = filteredCategories.length;
  const originalTotalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <>
      {/* Search and Filter Controls */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.securitySolution.siemReadiness.categoryTable.showing', {
                  defaultMessage: 'Showing {count} of {total} {itemName}',
                  values: {
                    count: totalItemsCount,
                    total: originalTotalItems,
                    itemName,
                  },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {'|'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.securitySolution.siemReadiness.categoryTable.categories', {
                  defaultMessage: '{count} categories',
                  values: { count: totalCategoriesCount },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isClearable
                style={{ width: `calc(${euiTheme.size.base} * 20)` }}
              />
            </EuiFlexItem>
            {filterOptions.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  {filterOptions.map((option, index) => (
                    <EuiFilterButton
                      key={option.value}
                      hasActiveFilters={filterValue === option.value}
                      onClick={() => setFilterValue(option.value)}
                      isSelected={filterValue === option.value}
                      isToggle
                      withNext={index < filterOptions.length - 1}
                    >
                      {option.label}
                    </EuiFilterButton>
                  ))}
                </EuiFilterGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <div
        style={{
          border: euiTheme.border.thin,
          padding: `${euiTheme.size.base} 0`,
          borderRadius: euiTheme.border.radius.medium,
        }}
      >
        {filteredCategories.map((category, index) => {
          return (
            <React.Fragment key={category.category}>
              <EuiAccordion
                style={{ padding: `0 ${euiTheme.size.base}` }}
                id={`accordion-${category.category}`}
                buttonContent={
                  <EuiText size="m" style={{ padding: `${euiTheme.size.base} 0` }}>
                    <strong>{category.category}</strong>
                  </EuiText>
                }
                extraAction={renderExtraAction(category)}
                paddingSize="none"
                borders="none"
                forceState={openAccordions[category.category] ? 'open' : 'closed'}
                onToggle={() => toggleAccordion(category.category)}
              >
                {openAccordions[category.category] && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiInMemoryTable
                      style={{
                        border: euiTheme.border.thin,
                        padding: euiTheme.size.xl,
                        borderRadius: euiTheme.border.radius.medium,
                      }}
                      items={category.items}
                      columns={columns}
                      sorting={
                        defaultSortField
                          ? {
                              sort: {
                                field: defaultSortField,
                                direction: defaultSortDirection,
                              },
                            }
                          : undefined
                      }
                      pagination={{
                        pageSizeOptions,
                        initialPageSize,
                      }}
                      tableCaption={i18n.translate(
                        'xpack.securitySolution.siemReadiness.categoryTable.tableCaption',
                        {
                          defaultMessage: '{itemName} for {category} category',
                          values: { itemName, category: category.category },
                        }
                      )}
                      tableLayout="auto"
                    />
                  </>
                )}
              </EuiAccordion>
              {index < filteredCategories.length - 1 && <EuiHorizontalRule margin="m" />}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
