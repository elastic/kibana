/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { getConversationsApis } from './apis';

type ConversationsSupertest = Parameters<typeof getConversationsApis>[0]['supertest'];
type GetConversationsService = (service: 'supertest') => ConversationsSupertest;

export const checkIfConversationExists = async ({
  getService,
  id,
  kibanaSpace,
}: {
  getService: GetConversationsService;
  id: string;
  kibanaSpace?: string;
}) => {
  const supertest = getService('supertest');
  const apisSuperuser = getConversationsApis({ supertest });
  const conversation = await apisSuperuser.get({ id, kibanaSpace });
  expect(conversation).toEqual(expect.objectContaining({ id }));
};
