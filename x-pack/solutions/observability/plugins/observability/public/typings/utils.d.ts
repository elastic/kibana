/**
 * Allow partial of nested object
 */
export type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};
