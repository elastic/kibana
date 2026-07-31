/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import type { EuiBasicTableProps } from '@elastic/eui';

/**
 * `EuiBasicTable` is a plain (non-memoized) generic class component, so it re-renders on
 * every render of its parent even when its props are unchanged. For large tables this is
 * expensive — e.g. when a parent holds selection/flyout state that changes on interactions
 * unrelated to the table's data.
 *
 * This wraps it in a memoized function component so it can bail out of re-renders when its
 * props are referentially stable. It is generic over the row type `T`, mirroring
 * `EuiBasicTable`'s own signature, and the `as typeof` cast restores that generic call
 * signature after `React.memo` (which otherwise widens it away).
 *
 * The function wrapper (rather than `React.memo(EuiBasicTable)` directly) is required:
 * `React.memo` does not accept `EuiBasicTable`'s generic class type, whereas a function
 * component is assignable. This mirrors the pattern used by APM's `ManagedTable`.
 *
 * Callers must ensure the props they pass are memoized/stable, otherwise the component
 * will re-render as before.
 */
const MemoizedBasicTableComponent = <T extends object>({
  tableCaption,
  ...props
}: EuiBasicTableProps<T>) => <EuiBasicTable<T> tableCaption={tableCaption} {...props} />;
MemoizedBasicTableComponent.displayName = 'MemoizedBasicTable';

/**
 * Memoized, generic, prop-transparent replacement for `EuiBasicTable`. Accepts the exact
 * same props (`EuiBasicTableProps<T>`) and can be swapped in wherever `EuiBasicTable` is
 * used with props. Instance refs are not forwarded (no consumer needs them); add
 * `forwardRef` if that ever changes.
 */
export const MemoizedBasicTable = React.memo(
  MemoizedBasicTableComponent
) as typeof MemoizedBasicTableComponent;
