/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-undef */

(function () {
  /**
   * Go from ['a', 'b', 'c', 'd', 'e']
   * To ['a.b.c.d.e', 'a.b.c.d', 'a.b.c', 'a.b']
   * @param arr The array to outpu
   */
  const outputArray = (arr) => {
    const output = [];
    let i = 0;
    while(i < arr.length - 1) {
      const end = i ? i * -1 : undefined;
      output.push(arr.slice(0, end).join('.'));
      i++;
    }
    return output;
  };

  const getAllNestedPathsFromArray = (arr, computedArray = []) => {
    // Output the array without skipping any item
    let output = [...computedArray, ...outputArray(arr)];

    // We remove the "head" and the "tail" of the array (pos 0 and arr.length -1)
    // We go from ['a', 'b', 'c', 'd', 'e'] (5 items)
    // To 3 modified arrays
    // ['a', 'c', 'd', 'e'] => outputArray()
    // ['a', 'd', 'e'] => outputArray()
    // ['a', 'e'] => outputArray()
    let itemsToSkip = arr.length - 2;
    if (itemsToSkip > 0) {
      while(itemsToSkip) {
        const newArray = [...arr];
        newArray.splice(1, itemsToSkip);
        output = [...output, ...outputArray(newArray)];
        itemsToSkip--;
      }
    }

    if (arr.length > 2) {
      // Recursively call the function skipping the first array item
      return getAllNestedPathsFromArray(arr.slice(1), output);
    }

    return output.sort();
  };

  chrome.storage.sync.get(['domTreeRoot', 'outputType', 'depth'], ({ domTreeRoot, outputType, depth = 2 }) => {
    const datasetKey = 'testSubj';

    if (domTreeRoot && !document.querySelector(domTreeRoot)) {
      // Let our popup extension know about this...
      chrome.runtime.sendMessage('TRACK_SUBJECTS_ERROR');
      throw new Error(`DOM node "${domTreeRoot}" not found.`);
    }

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

    const addTestSubject = (testSubject) => {
      const subjectDepth = testSubject.split('.').length;
      if (subjectDepth <= parseInt(depth, 10)) {
        window.__test_utils__.dataTestSubjects.add(testSubject);
      }
    };

    const findTestSubjects = (
      node = domTreeRoot ? document.querySelector(domTreeRoot) : document.querySelector('body'),
      path = []
    ) => {
      if (!node) {
        // We probably navigated outside the initial DOM root
        return;
      }
      const testSubjectOnNode = node.dataset[datasetKey];

      const updatedPath = testSubjectOnNode
        ? [...path, testSubjectOnNode]
        : path;

      if (!node.children.length) {
        const pathToString = updatedPath.join('.');

        if (pathToString) {
          // Add the complete nested path ('a.b.c.d')
          addTestSubject(pathToString);
          // Add each item separately
          updatedPath.forEach(addTestSubject);
          // Add all the combination ('a.b', 'a.c', 'a.e', ...)
          const nestedPaths = getAllNestedPathsFromArray(updatedPath);
          nestedPaths.forEach(addTestSubject);
        }

        return;
      }

      for (let i = 0; i < node.children.length; i++) {
        findTestSubjects(node.children[i], updatedPath);
      }
    };

    const output = () => {
      const { dataTestSubjects } = window.__test_utils__;
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
      const { dataTestSubjects } = window.__test_utils__;
      const total = dataTestSubjects.size;

      // Wait to be sure that the DOM has updated
      setTimeout(() => {
        findTestSubjects();
        if (dataTestSubjects.size === total) {
          // No new test subject, nothing to output
          return;
        }

        output();
      }, 500);

    };

    // Add meta data on the window object
    window.__test_utils__ = window.__test_utils__ || { documentClicksHandler, isTracking: false, dataTestSubjects: new Set() };

    // Handle "click" event on the document to update our test subjects
    if (!window.__test_utils__.isTracking) {
      document.addEventListener('click', window.__test_utils__.documentClicksHandler);
      window.__test_utils__.isTracking = true;
    }

    findTestSubjects();
    output();
  });
}());
