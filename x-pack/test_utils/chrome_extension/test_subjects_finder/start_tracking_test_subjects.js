/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-undef */

(function () {
  chrome.storage.sync.get(['domTreeRoot', 'outputType'], ({ domTreeRoot, outputType }) => {
    const datasetKey = 'testSubj';

    if (domTreeRoot && !document.querySelector(domTreeRoot)) {
      // Let our popup extension know about this...
      chrome.runtime.sendMessage('TRACK_SUBJECTS_ERROR');
      throw new Error(`DOM node "${domTreeRoot}" not found.`);
    }

    const dataTestSubjects = new Set();

    const arrayToType = array => (
      array.reduce((string, subject) => {
        return string === '' ? `'${subject}'` : `${string}\n | '${subject}'`;
      }, '')
    );

    const arrayToList = array => (
      array.reduce((string, subject) => {
        return string === '' ? `'${subject}'` : `${string}\n\'${subject}'`;
      }, '')
    );

    const findTestSubjects = (
      node = domTreeRoot ? document.querySelector(domTreeRoot) : document.querySelector('body'),
      path = []
    ) => {
      if (!node) {
        // We probably navigated outside the initial DOM root
        return;
      }

      const testSubjectOnNode = node.dataset[datasetKey];

      if (testSubjectOnNode) {
        dataTestSubjects.add(testSubjectOnNode);
      }

      const updatedPath = testSubjectOnNode
        ? [...path, testSubjectOnNode]
        : path;

      if (!node.children.length) {
        const pathToString = updatedPath.join('.');

        if (pathToString) {
          dataTestSubjects.add(pathToString);
        }

        return;
      }

      for (let i = 0; i < node.children.length; i++) {
        findTestSubjects(node.children[i], updatedPath);
      }
    };

    const output = () => {
      const allTestSubjects = Array.from(dataTestSubjects).sort();

      console.log(`------------- TEST SUBJECTS (${allTestSubjects.length}) ------------- `);

      const content = outputType === 'list'
        ? `${arrayToList(allTestSubjects)}`
        : `export type TestSubjects = ${arrayToType(allTestSubjects)}`;

      console.log(content);
    };

    // Handler for the clicks on the document to keep tracking
    // new test subjects
    const documentClicksHandler = () => {
      const total = dataTestSubjects.size;

      findTestSubjects();

      if (dataTestSubjects.size === total) {
        // No new test subject, nothing to output
        return;
      }

      output();
    };

    // Add meta data on the window object
    window.__test_utils__ = window.__test_utils__ || { documentClicksHandler, isTracking: false };

    // Handle "click" event on the document to update our test subjects
    if (!window.__test_utils__.isTracking) {
      document.addEventListener('click', window.__test_utils__.documentClicksHandler);
      window.__test_utils__.isTracking = true;
    }

    findTestSubjects();
    output();
  });
}());
