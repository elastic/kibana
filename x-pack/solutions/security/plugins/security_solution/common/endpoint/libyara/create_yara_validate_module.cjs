/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CJS re-export of the Emscripten factory.
 *
 * IMPORTANT: this must stay as `.cjs` (and require the `.cjs` glue). Kibana's
 * optimizer runs babel-loader on all non-node_modules `*.js` files, which
 * breaks Emscripten's UMD `module.exports` assignment and yields an empty
 * module in the browser bundle.
 */
module.exports = require('./wasm/dist/validate_yara.cjs');
