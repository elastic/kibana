/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  SyntheticsParamsReadonlyCodec,
  SyntheticsParamsReadonlyCodecList,
  SyntheticsParamsCodec,
  DeleteParamsResponseCodec,
  SyntheticsParamRequestCodec,
} from '../zod/synthetics_params';

export {
  SyntheticsParamsReadonlyCodec,
  SyntheticsParamsReadonlyCodecList,
  SyntheticsParamsCodec,
  DeleteParamsResponseCodec,
  SyntheticsParamRequestCodec,
};

export type SyntheticsParamsReadonly = SchemaOutput<typeof SyntheticsParamsReadonlyCodec>;
export type SyntheticsParams = SchemaOutput<typeof SyntheticsParamsCodec>;
export type SyntheticsParamSOAttributes = SchemaOutput<typeof SyntheticsParamsCodec>;
export type DeleteParamsResponse = SchemaOutput<typeof DeleteParamsResponseCodec>;
export type SyntheticsParamRequest = SchemaOutput<typeof SyntheticsParamRequestCodec>;
