/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockApiLog = {
  timestamp: '1970-01-01T12:00:00.000Z',
  http_method: 'POST',
  status: 200,
  user_agent: 'Mozilla/5.0',
  full_request_path: '/api/as/v1/engines/national-parks-demo/search.json',
  request_body: '{"query":"test search"}',
  response_body:
    '{"meta":{"page":{"current":1,"total_pages":0,"total_results":0,"size":20}},"results":[]}',
};
