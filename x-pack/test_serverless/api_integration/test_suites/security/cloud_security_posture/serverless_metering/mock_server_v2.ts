// src/mswServer.ts
import { setupServer } from 'msw/node';
import { http, bypass, HttpResponse } from 'msw';
import express from 'express';

const foo = 'http://localhost:3001/user';

export const handlers = [
  http.post(foo, async ({ request }) => {
    // const response = await fetch(request);
    console.log('A new request has been made');
    // interceptedRequestBody = { name: 'Working...' };
    return HttpResponse.json({ name: 'John' });
  }),
];
