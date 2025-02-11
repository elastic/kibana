/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

import { machine_learning_job_id_normalized } from '../normalized_ml_job_id';

export const machine_learning_job_id = t.union([t.string, machine_learning_job_id_normalized]);
export type MachineLearningJobId = t.TypeOf<typeof machine_learning_job_id>;

export const machineLearningJobIdOrUndefined = t.union([machine_learning_job_id, t.undefined]);
export type MachineLearningJobIdOrUndefined = t.TypeOf<typeof machineLearningJobIdOrUndefined>;
