/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import { CDR_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX } from '@kbn/cloud-security-posture-common';

const generateDataViewField = (name: string, type: 'string' | 'date' = 'string') => ({
  name,
  type,
  esTypes: [type === 'string' ? 'keyword' : 'date'],
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  metadata_field: false,
});

export const defaultDataViewFindHandler = http.get(
  'http://localhost/internal/data_views/fields',
  ({ request }) => {
    const url = new URL(request.url);
    const pattern = url.searchParams.get('pattern');

    if (pattern === 'logs-cloud_security_posture.findings_latest-*') {
      return HttpResponse.json({
        fields: [
          generateDataViewField('@timestamp', 'date'),
          generateDataViewField('resource.id'),
          generateDataViewField('resource.name'),
          generateDataViewField('resource.sub_type'),
          generateDataViewField('result.evaluation'),
          generateDataViewField('rule.benchmark.rule_number'),
          generateDataViewField('rule.name'),
          generateDataViewField('rule.section'),
        ],
        indices: ['logs-cloud_security_posture.findings_latest-default'],
      });
    }

    return HttpResponse.json({
      fields: [],
      indices: [],
    });
  }
);

export const defaultDataViewGetHandler = http.get(
  'http://localhost/internal/data_views/',
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // if (id?.includes('logs-cloud_security_posture.findings_latest-*')) {
    if (id?.includes(CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX)) {
      return HttpResponse.json({
        fields: [
          generateDataViewField('@timestamp', 'date'),
          generateDataViewField('resource.id'),
          generateDataViewField('resource.name'),
          generateDataViewField('resource.sub_type'),
          generateDataViewField('result.evaluation'),
          generateDataViewField('rule.benchmark.rule_number'),
          generateDataViewField('rule.name'),
          generateDataViewField('rule.section'),
        ],
        indices: [CDR_MISCONFIGURATIONS_INDEX_PATTERN],
      });
    }

    return HttpResponse.json({
      fields: [],
      indices: [],
    });
  }
);
