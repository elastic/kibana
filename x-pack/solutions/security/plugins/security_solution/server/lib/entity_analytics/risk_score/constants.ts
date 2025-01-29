/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The risk scoring algorithm uses a Riemann zeta function to sum an entity's risk inputs to a known, finite value (@see RIEMANN_ZETA_VALUE).
 * It does so by assigning each input a weight based on its position in the list (ordered by score) of inputs.
 * This value represents the complex variable s of Re(s) in traditional Riemann zeta function notation.
 *
 * Read more: https://en.wikipedia.org/wiki/Riemann_zeta_function
 */
export const RIEMANN_ZETA_S_VALUE = 1.5;

/**
 * Represents the value calculated by Riemann Zeta function for RIEMANN_ZETA_S_VALUE with 10.000 iterations (inputs) which is the default alertSampleSizePerShard.
 * The maximum unnormalized risk score value is calculated by multiplying RIEMANN_ZETA_S_VALUE by the maximum alert risk_score (100).
 *
 * This value is derived from RIEMANN_ZETA_S_VALUE, but we store the precomputed value here to be used more conveniently in normalization. @see RIEMANN_ZETA_S_VALUE
 *
 * The Riemann Zeta value for different number of inputs is:
 * | 𝑍(s,inputs)  |
 * | :---------------------------------------|
 * | 𝑍(1.5,10)≈1.9953364933456017            |
 * | 𝑍(1.5,100)≈2.412874098703719            |
 * | 𝑍(1.5,1000)≈2.5491456029175756          |
 * | 𝑍(1.5,10_000)≈2.5923758486729866        |
 * | 𝑍(1.5,100_000)≈2.6060508091764736       |
 * | 𝑍(1.5,1_000_000)≈2.6103753491852295     |
 * | 𝑍(1.5,10_000_000)≈2.611742893169012     |
 * | 𝑍(1.5,100_000_000)≈2.6121753486854478   |
 * | 𝑍(1.5,1_000_000_000)≈2.6123121030481857 |
 *
 * Read more: https://en.wikipedia.org/wiki/Riemann_zeta_function
 */
export const RIEMANN_ZETA_VALUE = 2.5924;

/**
 * This value represents the maximum possible risk score after normalization.
 */
export const RISK_SCORING_NORMALIZATION_MAX = 100;

/**
 * This value represents the max amount of alert inputs we store, per entity, in the risk document.
 */
export const MAX_INPUTS_COUNT = 10;
