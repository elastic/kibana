/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This sleep or delay is added to allow some time for the column to settle down before we get the value and to prevent the test from getting the wrong value*/
export const sleep = (num: number) => {
  return new Promise((res) => setTimeout(res, num));
};
