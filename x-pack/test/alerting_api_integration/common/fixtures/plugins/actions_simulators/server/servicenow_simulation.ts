/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

export const initPlugin = async () => http.createServer(handler);

const sendResponse = (response: http.ServerResponse, data: any) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(data, null, 4));
};

const handler = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  const buffers = [];
  let data: Record<string, unknown> = {};

  if (request.method === 'POST') {
    for await (const chunk of request) {
      buffers.push(chunk);
    }

    data = JSON.parse(Buffer.concat(buffers).toString());
  }

  const pathName = request.url!;

  if (pathName.includes('elastic_api/health')) {
    return sendResponse(response, {
      result: {
        name: 'Elastic',
        scope: 'x_elas2_inc_int',
        version: '1.0.0',
      },
    });
  }

  // Import Set API: Create or update incident
  if (
    pathName.includes('x_elas2_inc_int_elastic_incident') ||
    pathName.includes('x_elas2_sir_int_elastic_si_incident')
  ) {
    const update = data?.elastic_incident_id != null;
    return sendResponse(response, {
      import_set: 'ISET01',
      staging_table: 'x_elas2_inc_int_elastic_incident',
      result: [
        {
          transform_map: 'Elastic Incident',
          table: 'incident',
          display_name: 'number',
          display_value: 'INC01',
          record_link: '/api/now/table/incident/1',
          status: update ? 'updated' : 'inserted',
          sys_id: '123',
        },
      ],
    });
  }

  // Create incident
  if (
    pathName === '/api/now/v2/table/incident' ||
    pathName === '/api/now/v2/table/sn_si_incident'
  ) {
    return sendResponse(response, {
      result: { sys_id: '123', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' },
    });
  }

  // URLs of type /api/now/v2/table/incident/{id}
  // GET incident, PATCH incident
  if (
    pathName.includes('/api/now/v2/table/incident') ||
    pathName.includes('/api/now/v2/table/sn_si_incident')
  ) {
    return sendResponse(response, {
      result: {
        sys_id: '123',
        number: 'INC01',
        sys_created_on: '2020-03-10 12:24:20',
        sys_updated_on: '2020-03-10 12:24:20',
      },
    });
  }

  // Add multiple observables
  if (pathName.includes('/observables/bulk')) {
    return sendResponse(response, {
      result: [
        {
          value: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          observable_sys_id: '1',
        },
        {
          value: '127.0.0.1',
          observable_sys_id: '2',
        },
        {
          value: 'https://example.com',
          observable_sys_id: '3',
        },
      ],
    });
  }

  // Add single observables
  if (pathName.includes('/observables')) {
    return sendResponse(response, {
      result: {
        value: '127.0.0.1',
        observable_sys_id: '2',
      },
    });
  }

  if (pathName.includes('/api/now/table/sys_dictionary')) {
    return sendResponse(response, {
      result: [
        {
          column_label: 'Close notes',
          mandatory: 'false',
          max_length: '4000',
          element: 'close_notes',
        },
        {
          column_label: 'Description',
          mandatory: 'false',
          max_length: '4000',
          element: 'description',
        },
        {
          column_label: 'Short description',
          mandatory: 'false',
          max_length: '160',
          element: 'short_description',
        },
      ],
    });
  }

  if (pathName.includes('/api/now/table/sys_choice')) {
    return sendResponse(response, {
      result: [
        {
          dependent_value: '',
          label: '1 - Critical',
          value: '1',
        },
        {
          dependent_value: '',
          label: '2 - High',
          value: '2',
        },
        {
          dependent_value: '',
          label: '3 - Moderate',
          value: '3',
        },
        {
          dependent_value: '',
          label: '4 - Low',
          value: '4',
        },
        {
          dependent_value: '',
          label: '5 - Planning',
          value: '5',
        },
      ],
    });
  }

  if (pathName === '/api/global/em/jsonv2') {
    return sendResponse(response, {
      result: {
        'Default Bulk Endpoint': '1 events were inserted',
      },
    });
  }

  // Return an 400 error if endpoint is not supported
  response.statusCode = 400;
  response.setHeader('Content-Type', 'application/json');
  response.end('Not supported endpoint to request servicenow simulator');
};
