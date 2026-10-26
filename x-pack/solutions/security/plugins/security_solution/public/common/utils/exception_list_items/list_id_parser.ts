/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper function to extract list ids from an imported file. Does not check whether
 * the file is valid, just tries to find list_id fields, so it can be used on UI side
 * as a pre-check to ensure only the correct artifact type is being imported.
 *
 * @param file {File} file to extract list ids from
 * @returns {Promise<Set<string>>} set of list ids found in the file
 */
export const parseListIdsFromImportedFile = async (file: File): Promise<Set<string>> =>
  (await file.text())
    .split('\n')
    .filter((x) => x.trim() !== '')
    .reduce((acc, line) => {
      try {
        const parsedItem = JSON.parse(line);

        if (parsedItem.list_id) {
          acc.add(parsedItem.list_id);
        }
      } catch (e) {
        // ignore parsing errors, the API will handle them and return an error for the line
      }

      return acc;
    }, new Set<string>());
