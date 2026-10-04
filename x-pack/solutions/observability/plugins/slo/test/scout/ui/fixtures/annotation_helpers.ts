/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import moment from 'moment';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { KbnClient } from '@kbn/scout-oblt';

const ANNOTATION_API_PATH = '/api/observability/annotation';

/** Every title and message this suite writes starts with it, so cleanup can sweep by prefix. */
export const TEST_ANNOTATION_PREFIX = 'Scout SLO annotation';

export interface AnnotationNames {
  title: string;
  message: string;
}

export const uniqueAnnotationNames = (): AnnotationNames => {
  const suffix = randomUUID().slice(0, 8);
  return {
    title: `${TEST_ANNOTATION_PREFIX} ${suffix}`,
    message: `${TEST_ANNOTATION_PREFIX} description ${suffix}`,
  };
};

/**
 * Creates an annotation applying to all SLOs through the public API, mirroring the shape the
 * create flyout submits.
 */
export const createTestAnnotation = async (kbnClient: KbnClient): Promise<AnnotationNames> => {
  const { title, message } = uniqueAnnotationNames();
  const timestamp = moment().subtract(1, 'day').toISOString();

  await kbnClient.request({
    method: 'POST',
    path: ANNOTATION_API_PATH,
    body: {
      '@timestamp': timestamp,
      message,
      event: { start: timestamp },
      annotation: {
        title,
        style: {
          icon: 'triangle',
          line: { width: 2, style: 'solid', textDecoration: 'name' },
        },
      },
      slo: { id: ALL_VALUE },
    },
  });

  return { title, message };
};

/** Deletes every annotation this suite owns, including leftovers from a run that died mid-test. */
export const deleteTestAnnotations = async (kbnClient: KbnClient) => {
  const { data } = await kbnClient.request<{
    items: Array<{ id: string; annotation?: { title?: string } }>;
  }>({
    method: 'GET',
    path: `${ANNOTATION_API_PATH}/find`,
  });

  await Promise.all(
    (data.items ?? [])
      .filter((item) => item.annotation?.title?.startsWith(TEST_ANNOTATION_PREFIX))
      .map((item) =>
        kbnClient.request({
          method: 'DELETE',
          path: `${ANNOTATION_API_PATH}/${item.id}`,
          ignoreErrors: [404],
        })
      )
  );
};
