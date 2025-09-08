/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FlattenProps {
  path: string[];
  value: unknown;
}

export const flattenProps = (object: Object): FlattenProps[] => {
  if (!object) {
    return [];
  }

  const flat = [];
  const memStack: { key: keyof Object; level: Object; pos: number }[] = [];
  let currentLevel: Object = object;
  let currentLevelKeys = Object.keys(currentLevel);
  let currentLevelPos = 0;

  while (currentLevel !== null) {
    const currentKey = currentLevelKeys[currentLevelPos] as keyof typeof currentLevel;
    const currentValue = currentLevel[currentKey];

    // If it's an object, go deeper in it
    if (typeof currentValue === 'object' && !Array.isArray(currentValue)) {
      memStack.push({
        key: currentKey, // saved to reconstruct path
        level: currentLevel,
        pos: currentLevelPos,
      });

      currentLevel = currentValue;
      currentLevelKeys = Object.keys(currentLevel);
      currentLevelPos = 0;

      // eslint-disable-next-line no-continue
      continue;
    }

    // we need to check if we are within boundaries
    // because empty objects can exist
    if (currentLevelKeys.length > currentLevelPos && !isEmptyArray(currentValue)) {
      const path = memStack.map((mem) => mem.key).concat([currentKey]);
      flat.push({ path, value: currentValue });
    }

    // while we are at the end of the object, we keep going up one level
    while (currentLevelKeys.length <= currentLevelPos + 1) {
      const previousLevel = memStack.pop();

      if (!previousLevel) {
        // if there was no previous level, there are no other
        // attributes to verify
        break;
      }

      currentLevel = previousLevel.level;
      currentLevelKeys = Object.keys(currentLevel);
      currentLevelPos = previousLevel.pos; // advance to the next position
    }

    // if we are still at the end of the object, it means
    // we looked all attributes
    if (currentLevelKeys.length <= currentLevelPos + 1) {
      break;
    }

    currentLevelPos++;
  }

  return flat;
};

function isEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length === 0;
}
