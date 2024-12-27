/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const readUploadedFileAsBase64 = (fileInput: File): Promise<string> => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = () => {
      // We need to split off the prefix from the DataUrl and only pass the base64 string
      // before: 'data:image/png;base64,encodedData=='
      // after: 'encodedData=='
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    try {
      reader.readAsDataURL(fileInput);
    } catch {
      reader.abort();
      reject(new Error());
    }
  });
};
