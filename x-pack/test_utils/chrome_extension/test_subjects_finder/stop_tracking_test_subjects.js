/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

if (window.__test_utils__ && window.__test_utils__.isTracking) {
  document.removeEventListener('click', window.__test_utils__.documentClicksHandler);
  window.__test_utils__.isTracking = false;
  window.__test_utils__.dataTestSubjects = new Set();
}
