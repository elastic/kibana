/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `dom-to-image-more` ships without type declarations; only what the executive brief PDF exporter uses is declared. */
declare module 'dom-to-image-more' {
  namespace domtoimage {
    interface Options {
      quality?: number;
      bgcolor?: string;
      cacheBust?: boolean;
      /** Size of the output in CSS pixels; the root node is given this size and anything beyond is clipped. */
      width?: number;
      height?: number;
      /** Styles applied to the root node of the clone, after everything else. */
      style?: Partial<CSSStyleDeclaration>;
      /** Return false to exclude a style sheet (e.g. cross-origin sheets). */
      styleFilter?: (style: CSSStyleSheet) => boolean;
      /** Return false to exclude a node (and its subtree) from the capture. */
      filter?: (node: Node) => boolean;
    }

    function toBlob(node: Node, options?: Options): Promise<Blob>;
  }

  export = domtoimage;
}
