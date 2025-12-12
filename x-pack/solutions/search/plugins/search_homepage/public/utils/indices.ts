/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function generateRandomIndexName(
  prefix: string = 'search-',
  randomSuffixLength: number = 4
) {
  const suffixCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = suffixCharacters.length;
  let result = prefix;

  let counter = 0;
  do {
    result += suffixCharacters.charAt(Math.random() * charsLength);
    counter++;
  } while (counter < randomSuffixLength);

  return result;
}
