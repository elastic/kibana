/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Define types for the input object structure
interface TypedProperty {
  type: string;
}

interface NestedObject {
  [key: string]: TypedProperty | NestedObject;
}

// Type for stack entries
interface StackEntry {
  obj: NestedObject;
  result: string | null;
  processed: boolean;
}

function hasTypeProperty(obj: TypedProperty | NestedObject): obj is TypedProperty {
  return 'type' in obj && typeof obj.type === 'string';
}

export function compressMapping(obj: NestedObject): string {
  // Group top-level keys by type
  const typeGroups: Record<string, string[]> = {};
  const nestedObjs: Array<[string, NestedObject]> = [];

  // Organize properties by type or as nested objects
  Object.entries(obj).forEach(([key, value]) => {
    if (hasTypeProperty(value)) {
      const type = value.type;
      typeGroups[type] = typeGroups[type] || [];
      typeGroups[type].push(key);
    } else {
      nestedObjs.push([key, value]);
    }
  });

  // Format the result
  const parts: string[] = [];

  // Add grouped simple properties
  for (const [type, keys] of Object.entries(typeGroups)) {
    parts.push(`${keys.join(',')}:${type}`);
  }

  // Add nested objects
  for (const [key, nestedObj] of nestedObjs) {
    parts.push(`${key}:{${formatNestedObject(nestedObj)}}`);
  }

  return parts.join('\n');
}

function formatNestedObject(obj: NestedObject): string {
  // Stack to track objects that need processing
  const stack: StackEntry[] = [{ obj, result: null, processed: false }];
  // Cache for already processed objects to avoid cycles
  const cache = new Map<NestedObject, string>();

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    /* eslint-disable no-continue */
    // If already processed this object, pop it and continue
    if (current.processed) {
      stack.pop();
      continue;
    }

    // If we've seen this object before, use cached result
    const cachedValue = cache.get(current.obj);
    if (cachedValue) {
      current.result = cachedValue;
      stack.pop();
      continue;
    }
    /* eslint-enable no-continue */

    // Group properties by type
    const typeGroups: Record<string, string[]> = {};
    const nestedProps: Array<[string, NestedObject]> = [];

    for (const [propKey, propValue] of Object.entries(current.obj)) {
      if (hasTypeProperty(propValue)) {
        // Group by type
        const type = propValue.type;
        typeGroups[type] = typeGroups[type] || [];
        typeGroups[type].push(propKey);
      } else {
        // Track nested objects
        nestedProps.push([propKey, propValue]);
      }
    }

    // Process all nested objects first
    let allNestedProcessed = true;
    const formattedParts: string[] = [];

    // Add type groups to formatted parts
    for (const [type, keys] of Object.entries(typeGroups)) {
      formattedParts.push(keys.length === 1 ? `${keys[0]}:${type}` : `${keys.join(',')}:${type}`);
    }

    // Process nested objects
    for (const [propKey, propValue] of nestedProps) {
      // If we have a cached result, use it
      if (cache.has(propValue)) {
        formattedParts.push(`${propKey}:{${cache.get(propValue)}}`);
      } else {
        // Push to stack for processing
        stack.push({ obj: propValue, result: null, processed: false });
        allNestedProcessed = false;
      }
    }

    // If all nested objects are processed, finalize this object
    if (allNestedProcessed) {
      current.result = formattedParts.join(',');
      cache.set(current.obj, current.result);
      current.processed = true;
    }
  }

  // Return result from the first item we pushed to stack (root object)
  return cache.get(obj) || '';
}
