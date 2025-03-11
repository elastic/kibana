export type GetEntriesAtKeyMapping = { [key: string]: GetEntriesAtKeyMapping | undefined | string } | undefined | string ;


export const getEntriesAtKey = (
    mapping: GetEntriesAtKeyMapping,
    keys: string[]
  ): GetEntriesAtKeyMapping => {
    if (mapping === undefined) {
      return undefined;
    }
    if (keys.length === 0) {
      return mapping;
    }
  
    if (typeof mapping !== 'object') {
      return mapping;
    }
  
    const key = keys.shift();
    if (key === undefined) {
      return mapping;
    }
  
    return getEntriesAtKey(mapping[key], keys);
  };
  
  export const formatEntriesAtKey = (mapping: GetEntriesAtKeyMapping): Record<string, string> => {
    if (mapping === undefined) {
      return {};
    }
    return Object.entries(mapping).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? value : 'Object';
      return acc;
    }, {} as Record<string, string>);
  };