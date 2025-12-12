/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface PickTypeForNameParameters {
  name: string;
  type: string;
  typesByFieldName?: Record<string, string[] | undefined>;
}

export function pickTypeForName({ name, type, typesByFieldName = {} }: PickTypeForNameParameters) {
  const typesAvailableForName = typesByFieldName[name] || [];
  const isCurrentTypeAvailableForNewName = typesAvailableForName.includes(type);

  /* First try to keep the type if it's available for the name */
  if (isCurrentTypeAvailableForNewName) {
    return type;
  }

  /*
    If current type is not available, pick the first available type.
    If no type is available, use the current type.
  */
  return typesAvailableForName[0] ?? type;
}
