/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  type PropsWithChildren,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { FormHook } from '../../../../../../../shared_imports';
import { invariant } from '../../../../../../../../common/utils/invariant';

type FieldEditFormCleanUp = () => void;

interface FieldEditFormContextType {
  form: FormHook | undefined;
  registerForm: (form: FormHook) => FieldEditFormCleanUp;
}

const FieldEditFormContext = createContext<FieldEditFormContextType | null>(null);

/**
 * FieldEditFormContext helps to encapsulate form related logic in `field_final_side` folder.
 *
 * The only purpose is to obtain the recent form handler and provide it for consumers in
 * in the `field_final_side` folder.
 */
export function FieldEditFormContextProvider({ children }: PropsWithChildren<{}>) {
  // Using reference reduces unnecessary re-renders though we need to re-render children
  // whenever something in the form changes like validity state to be able to reflect that changes.
  const formRef = useRef<FormHook | undefined>();
  // Setting the state re-renders the component and its children. The state value is ignored since
  // we use a ref here. In that case it doesn't re-render components upon form cleanup. In that case
  // the edit component disappears and we aren't interested in the form's state anymore.
  const [, setForm] = useState<FormHook | undefined>();
  const registerForm = useCallback(
    (formToRegister: FormHook) => {
      // Guard against subtle bugs. In attempt of using two forms throw an exception.
      if (formRef.current) {
        throw new Error(
          'Unexpected new form registration while the old one was not cleaned. Do you properly cleanup form by returning registerForm result from useEffect.'
        );
      }

      formRef.current = formToRegister;
      setForm(formToRegister);

      return () => (formRef.current = undefined);
    },
    [formRef, setForm]
  );

  return (
    <FieldEditFormContext.Provider value={{ form: formRef.current, registerForm }}>
      {children}
    </FieldEditFormContext.Provider>
  );
}

export function useFieldEditFormContext() {
  const context = useContext(FieldEditFormContext);

  invariant(
    context !== null,
    'useFieldEditFormContext must be used inside a FieldEditFormProvider'
  );

  return context;
}
