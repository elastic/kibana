/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseNdjson = (messages: string[]): object[][] => {
  return messages.map((message) => {
    const splitByNewLine = message.split('\n');
    const linesParsed = splitByNewLine.flatMap<object>((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return [];
      }
    });
    return linesParsed;
  });
};
