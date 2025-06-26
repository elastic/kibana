/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v5 as uuidv5 } from 'uuid';

const PRIVMON_API_KEY_SO_ID = '19540C97-E35C-485B-8566-FB86EC8455E4';

export const getPrivmonEncryptedSavedObjectId = (space: string) => {
  return uuidv5(space, PRIVMON_API_KEY_SO_ID);
};
