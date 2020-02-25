/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-undef */

// const trace = (message) => {
//   chrome.tabs.executeScript(
//     undefined,
//     { code: `console.log("${message}")` },
//   );
// };

const isTrackingTestSubjects = () =>
  new Promise(resolve => {
    chrome.tabs.executeScript(
      undefined,
      { code: '(() => Boolean(window.__test_utils__ && window.__test_utils__.isTracking))()' },
      ([result]) => {
        resolve(result);
      }
    );
  });

const onStartTracking = () => {
  document.body.classList.add('is-tracking');
};

const onStopTracking = () => {
  document.body.classList.remove('is-tracking');
};

chrome.storage.sync.get(
  ['outputType', 'domTreeRoot', 'depth'],
  async ({ outputType, domTreeRoot, depth }) => {
    const domRootInput = document.getElementById('domRootInput');
    const outputTypeSelect = document.getElementById('outputTypeSelect');
    const depthInput = document.getElementById('depthInput');
    const startTrackButton = document.getElementById('startTrackingButton');
    const stopTrackButton = document.getElementById('stopTrackingButton');

    const isTracking = await isTrackingTestSubjects();

    // UI state
    if (isTracking) {
      document.body.classList.add('is-tracking');
    } else {
      document.body.classList.remove('is-tracking');
    }

    // FORM state
    if (domTreeRoot) {
      domRootInput.value = domTreeRoot;
    }

    if (depth) {
      depthInput.value = depth;
    }

    document.querySelectorAll('#outputTypeSelect option').forEach(node => {
      if (node.value === outputType) {
        node.setAttribute('selected', 'selected');
      }
    });

    // FORM events
    domRootInput.addEventListener('change', e => {
      const { value } = e.target;
      chrome.storage.sync.set({ domTreeRoot: value });
    });

    depthInput.addEventListener('change', e => {
      const { value } = e.target;
      if (value) {
        chrome.storage.sync.set({ depth: value });
      }
    });

    outputTypeSelect.addEventListener('change', e => {
      const { value } = e.target;
      chrome.storage.sync.set({ outputType: value });
    });

    startTrackButton.addEventListener('click', () => {
      onStartTracking();

      chrome.tabs.executeScript(undefined, { file: 'start_tracking_test_subjects.js' });
    });

    stopTrackButton.addEventListener('click', () => {
      onStopTracking();

      chrome.tabs.executeScript(undefined, { file: 'stop_tracking_test_subjects.js' });
    });
  }
);

chrome.runtime.onMessage.addListener(request => {
  if (request === 'TRACK_SUBJECTS_ERROR') {
    onStopTracking();
  }
});
