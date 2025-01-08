/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBox } from '@elastic/eui';

import { useCallback, useState, useRef } from 'react';

/**
 * This hook is used to imperatively reset an `EuiComboBox`. When users trigger
 * validation errors in the combo box, it will not accept new values
 * programmatically until the validation errors are resolved by clearing
 * the input.
 *
 * Q: Why does this hook exist?
 *
 * A: When users click the `Reset group by field` action, the `EuiComboBox` is
 * reset to a default value (e.g. `host.name`) by updating `EuiComboBox`'s
 * `selectedOptions` prop. However, if the user has triggered an `EuiComboBox`
 * validation error by manually entering text, for example:
 * `this text is not a valid option`, the `EuiComboBox` will NOT display the
 * updated value of the `selectedOptions` prop, because there are (still)
 * validation errors.
 *
 * This hook returns an `onReset` function that clears the `EuiComboBox` input,
 * resolving any validation errors.
 *
 * NOTE: The `comboboxRef` and `setComboboxInputRef` MUST be provided to
 * `EuiComboBox`via it's `ref` and `inputRef` props.
 *
 * Returns:
 * - `onReset`: calling `onReset()` clears the `EuiComboBox` input, resolving any validation errors
 * - `comboboxRef`: REQUIRED: provide this value to the `ref` prop of an `EuiComboBox`
 * - `setComboboxInputRef`: REQUIRED: provide this function to the `inputRef` prop of an `EuiComboBox`
 */
export const useEuiComboBoxReset = () => {
  const comboboxRef = useRef<EuiComboBox<string | number | string[] | undefined>>(null);
  const [comboboxInputRef, setComboboxInputRef] = useState<HTMLInputElement | null>(null);

  const onReset = useCallback(() => {
    comboboxRef.current?.clearSearchValue(); // EuiComboBox attaches the clearSearchValue function to the ref

    if (comboboxInputRef != null) {
      comboboxInputRef.value = '';
    }
  }, [comboboxInputRef]);

  return { comboboxRef, onReset, setComboboxInputRef };
};
