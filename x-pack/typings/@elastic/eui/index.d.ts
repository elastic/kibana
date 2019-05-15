/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI

declare module '@elastic/eui' {
  export const EuiDescribedFormGroup: React.SFC<any>;
  export const EuiCodeEditor: React.SFC<any>;
  export const Query: any;
  export const EuiCard: any;
}

declare module '@elastic/eui/lib/services/format' {
  export const dateFormatAliases: any;
}
