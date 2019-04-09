/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findTestSubject } from './index';

export function setInputValue(component, inputTestSubject, value, isAsync = false) {
  const formInput = typeof inputTestSubject === 'string'
    ? findTestSubject(component, inputTestSubject)
    : inputTestSubject;

  formInput.simulate('change', { target: { value } });
  component.update();

  // In some cases, changing an input value triggers an http request to validate
  // it. Even by returning immediately the response on the mock server we need
  // to wait until the next tick before the DOM updates.
  // Setting isAsync to "true" solves that problem.
  if (!isAsync) {
    return;
  }
  return new Promise((resolve) => setTimeout(resolve));
}
