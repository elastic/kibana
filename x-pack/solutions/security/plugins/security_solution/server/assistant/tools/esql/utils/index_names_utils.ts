export const generateIndexNamesWithWildcards = (fullIndexNames: string[]): string[] => {
    const result = new Set(fullIndexNames);
    const partsList = fullIndexNames.map(str => str.split('.'));
    const occurrences = new Map();
    
    for (const parts of partsList) {
        for (let mask = 1; mask < (1 << parts.length); mask++) {
            let wildcardVersion = parts.map((part, idx) => (mask & (1 << idx)) ? '*' : part);
            let wildcardStr = wildcardVersion.join('.');
            occurrences.set(wildcardStr, (occurrences.get(wildcardStr) || 0) + 1);
        }
    }
    
    for (const [wildcardStr, count] of occurrences.entries()) {
        if (count > 1) {
            result.add(wildcardStr);
        }
    }
    
    return Array.from(result).slice(0, fullIndexNames.length * 3);
}