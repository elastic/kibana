/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

/**
 * Sparkle wiggle: rotate slightly while scaling up and back. Combined with
 * EUI's `animation.bounce` easing token this gives the yellow stars a
 * playful, gentle "twinkle" motion that loops forever.
 */
const sparkleWiggle = keyframes`
  0%, 100% {
    transform: rotate(-7deg) scale(1);
  }
  50% {
    transform: rotate(7deg) scale(1.12);
  }
`;

/**
 * One-shot "flicker on" entrance animation, modeled after the neon-sign
 * turn-on effect Notion uses on notion.com/product
 * (`HomepageHeroAgents_flicker-on__*`). Plays once when the illustration
 * first mounts: opacity ramps from 0 to 1 with several rapid flickers
 * before settling.
 */
const flickerOn = keyframes`
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  12%  { opacity: 0.2; }
  16%  { opacity: 1; }
  20%  { opacity: 0.1; }
  24%  { opacity: 0.9; }
  28%  { opacity: 0.4; }
  32%  { opacity: 1; }
  40%  { opacity: 0.7; }
  44%  { opacity: 1; }
  100% { opacity: 1; }
`;

/**
 * Slow, gentle "breathing" pulse that runs forever. Smooth opacity
 * oscillation so the halo feels like an ambient glow rather than a sharp
 * flickering bulb. The dip is big enough to be clearly perceivable but
 * slow enough (paired with `ease-in-out`) that it never feels jarring.
 */
const flicker = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
`;

const containerStyles = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /*
   * Allow the halo to render outside the icon slot's bounding box in
   * case EuiEmptyPrompt's icon wrapper sets a clipped layout.
   */
  overflow: visible;

  /*
   * Promote the SVG into the stacking context so it paints in DOM order
   * relative to the absolutely-positioned glow sibling. Without this the
   * (static-position) SVG paints below the (absolute-position) glow and
   * the halo ends up in FRONT of the illustration.
   */
  > svg {
    position: relative;
  }
`;

const glowBackdropStyles = css`
  position: absolute;
  /*
   * Negative inset so the glow bleeds beyond the SVG's bounding box,
   * producing a soft halo rather than a cropped disc. Scaled to the
   * doubled illustration size so the halo stays proportional.
   */
  inset: -60px;
  border-radius: 50%;
  /*
   * Radial gradient using the AI Agent button's "on-dark" stops
   * (#61A2FF → #C5A5FA). Higher alpha than the original prototype so the
   * halo is clearly visible against the Nightshift dark background.
   */
  background: radial-gradient(
    closest-side,
    rgba(97, 162, 255, 0.7) 0%,
    rgba(197, 165, 250, 0.4) 40%,
    transparent 75%
  );
  filter: blur(14px);
  pointer-events: none;
  /*
   * Rendered FIRST in the DOM (before the SVG), so without any z-index
   * the SVG paints naturally on top. Avoids a negative z-index, which
   * can end up clipped by parent containers that paint their own
   * backgrounds.
   *
   * Two-stage animation timing:
   *  - flicker-on: single 1.2s ease-out entrance, fill-mode both so the
   *    glow stays at full opacity once the animation finishes.
   *  - flicker:    7s infinite ease-in-out breathing, starting after a
   *    1.2s delay so the entrance flows directly into the gentle pulse.
   */
  animation: ${flickerOn} 1.2s ease-out both, ${flicker} 7s 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * Welcome illustration for the Nightshift landing page (an exported Figma
 * asset). Rendered as inline SVG so it can be styled with `currentColor` /
 * dark-mode if needed later, and so it doesn't trigger an extra HTTP
 * request on landing. A separate soft radial-gradient backdrop sits
 * behind the SVG and carries the flicker animations, so the illustration
 * itself stays steady while the halo around it pulses.
 *
 * The two yellow sparkles get an extra "twinkle" animation: a gentle
 * rotate + scale loop using EUI's `animation.bounce` easing
 * (`euiTheme.animation.bounce`), per the EUI animation guidelines
 * (https://eui.elastic.co/docs/getting-started/working-with-emotion/migrating-from-sass/#animations).
 * The two sparkles are staggered (different durations + delay) so they
 * don't move in lockstep.
 */
export const NightshiftIllustration: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  /*
   * `transform-box: fill-box` re-anchors transforms to each path's own
   * bounding box (instead of the SVG viewport), and `transform-origin:
   * center` makes the rotate + scale pivot around each sparkle's center
   * rather than the SVG's top-left corner.
   */
  const sparkleBase = css`
    transform-box: fill-box;
    transform-origin: center;
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
  const sparklePrimary = css`
    ${sparkleBase};
    animation: ${sparkleWiggle} 3.6s ${euiTheme.animation.bounce} infinite;
  `;
  const sparkleSecondary = css`
    ${sparkleBase};
    animation: ${sparkleWiggle} 4.4s ${euiTheme.animation.bounce} infinite;
    animation-delay: 0.7s;
  `;

  return (
    <span css={containerStyles}>
      <span css={glowBackdropStyles} aria-hidden="true" />
      <svg
        width="226"
        height="242"
        viewBox="0 0 113 121"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
    <path
      d="M47.7889 112.199C47.7889 112.199 80.5289 103.459 85.5689 98.4292L72.7289 92.6992L49.8389 97.1192L45.3389 109.459L47.7889 112.189V112.199Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M94.9993 76.7311L102.319 46.6811C103.279 42.7411 100.529 38.8611 96.4893 38.4611L71.4993 36.0111L44.5693 33.0011C41.1893 32.6211 38.0593 34.8511 37.3193 38.1711C35.2293 47.5011 30.8093 65.6311 26.2393 74.6811C21.4893 84.0611 13.2693 98.9011 9.45931 105.721C8.49931 107.431 9.62931 109.571 11.5793 109.741L41.7993 112.451C46.5093 112.871 51.1693 111.211 54.5393 107.901C56.2093 106.261 57.9193 104.551 59.1393 103.251C61.7093 100.511 64.9793 99.2811 69.1293 99.0611C70.7193 98.9811 72.3093 99.0811 73.8793 99.3111C77.0593 99.7811 85.1993 100.501 87.9593 96.0411C91.4193 90.4511 94.9993 76.7111 94.9993 76.7111V76.7311Z"
      fill="#F5F7FA"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M42.1699 49.9121L88.1199 54.9121"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M43.2197 60.6719L73.3997 63.7319"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M40.2197 70.8223L77.0397 74.5523"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M36.4297 81.582L58.0897 83.522"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M88.389 89.6406C75.729 89.6406 65.459 94.1606 65.459 99.7406V109.841C65.459 115.421 75.729 119.941 88.389 119.941C101.049 119.941 111.319 115.421 111.319 109.841V99.7406C111.319 94.1606 101.049 89.6406 88.389 89.6406Z"
      fill="#0B64DD"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M88.389 109.841C101.053 109.841 111.319 105.319 111.319 99.7406C111.319 94.1626 101.053 89.6406 88.389 89.6406C75.7251 89.6406 65.459 94.1626 65.459 99.7406C65.459 105.319 75.7251 109.841 88.389 109.841Z"
      fill="white"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M88.8997 72.3125C76.2397 72.3125 65.9697 76.8325 65.9697 82.4125V92.5125C65.9697 98.0925 76.2397 102.613 88.8997 102.613C101.56 102.613 111.83 98.0925 111.83 92.5125V82.4125C111.83 76.8325 101.56 72.3125 88.8997 72.3125Z"
      fill="#0B64DD"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M88.8997 92.5125C101.564 92.5125 111.83 87.9905 111.83 82.4125C111.83 76.8344 101.564 72.3125 88.8997 72.3125C76.2358 72.3125 65.9697 76.8344 65.9697 82.4125C65.9697 87.9905 76.2358 92.5125 88.8997 92.5125Z"
      fill="white"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M79.0993 96.9195C74.6793 96.0595 70.9893 94.5895 68.5693 92.7695"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M79.0993 113.5C74.6793 112.64 70.9893 111.17 68.5693 109.35"
      stroke="#101C3F"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M57.8901 29.4512L53.1601 30.9612C53.1601 30.9612 53.1301 30.9612 53.1201 30.9712L57.8501 29.4612C57.8501 29.4612 57.8801 29.4612 57.8901 29.4512Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M62.9799 46.9426L61.4399 47.1626C61.3399 47.1726 61.2499 47.1826 61.1499 47.1726L56.4199 48.6826C56.5199 48.6826 56.6099 48.6826 56.7099 48.6726L58.2499 48.4526C58.3199 48.4526 58.3799 48.4326 58.4499 48.4026L63.1799 46.8926C63.1199 46.9126 63.0499 46.9326 62.9799 46.9426Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M18.0288 24.9303L22.7588 23.4203L22.1388 20.1303C21.9888 19.3003 22.3888 18.5303 23.0688 18.3203L18.3388 19.8303C17.6688 20.0403 17.2588 20.8203 17.4088 21.6403L18.0288 24.9303Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M20.9699 64.221C16.9299 64.791 12.9099 61.431 12.0299 56.761L11.5399 54.141H11.5199C11.4299 54.181 11.3499 54.201 11.2599 54.211L9.71992 54.431C8.92992 54.541 8.13992 53.871 7.96992 52.971L5.26992 38.541C5.18992 38.091 5.27992 37.661 5.48992 37.321L8.22992 36.451L7.73992 33.831C6.93992 29.571 9.02992 25.641 12.4699 24.541L7.73992 26.051C4.29992 27.141 2.21992 31.081 3.00992 35.341L3.42992 37.611L1.45992 38.241C0.789919 38.451 0.37992 39.231 0.52992 40.061L3.22992 54.491C3.39992 55.401 4.18992 56.061 4.97992 55.951L6.51992 55.731C6.60992 55.721 6.68992 55.701 6.77992 55.671H6.79992L7.28992 58.281C8.15992 62.951 12.1799 66.301 16.2299 65.741L51.1299 60.831C51.4899 60.781 51.8399 60.701 52.1699 60.591L56.9099 59.081C56.5799 59.191 56.2299 59.271 55.8699 59.321L20.9699 64.231V64.221Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M36.2893 16.012C37.0793 15.902 37.8593 16.562 38.0293 17.462L38.6493 20.752L48.4093 19.382C52.4593 18.812 56.4793 22.162 57.3493 26.832L57.8393 29.452C57.9293 29.422 58.0193 29.402 58.1193 29.382L59.6593 29.162C60.4493 29.052 61.2393 29.722 61.4093 30.622L64.1093 45.052C64.2793 45.962 63.7593 46.812 62.9793 46.922L61.4393 47.142C61.3393 47.152 61.2493 47.162 61.1493 47.152L61.6393 49.772C62.5093 54.442 59.9193 58.722 55.8693 59.292L20.9693 64.202C16.9293 64.772 12.9093 61.412 12.0293 56.742L11.5393 54.122C11.4393 54.152 11.3493 54.182 11.2493 54.192L9.70929 54.412C8.91929 54.522 8.12929 53.852 7.95929 52.952L5.25929 38.522C5.08929 37.612 5.59929 36.762 6.37929 36.652L7.91929 36.432C8.01929 36.422 8.10929 36.412 8.21929 36.422L7.72929 33.802C6.85929 29.132 9.44929 24.852 13.4893 24.282L23.2493 22.912L22.6293 19.622C22.4593 18.712 22.9693 17.872 23.7593 17.762L36.2593 16.002L36.2893 16.012Z"
      fill="#48EFCF"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M49.1193 22.8715C51.2293 22.5715 53.3393 24.3115 53.8193 26.7615L58.5693 50.7215C59.0593 53.1715 57.7393 55.4015 55.6293 55.7115L20.0793 60.7715C17.9693 61.0715 15.8693 59.3315 15.3793 56.8715L10.6293 32.9115C10.1493 30.4715 11.4593 28.2415 13.5693 27.9415L49.1193 22.8815V22.8715Z"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M24.9086 38.6245C27.1318 38.3107 29.4854 40.1585 30.0277 42.935L30.0287 42.938C30.0456 43.0232 30.0274 43.0898 30.0053 43.1274C29.9854 43.1611 29.969 43.1641 29.9662 43.1645C29.9575 43.1658 29.9183 43.1659 29.8646 43.1225C29.8257 43.091 29.7897 43.0443 29.767 42.9858L29.7494 42.9233C29.5173 41.7304 28.8867 40.7081 28.0473 40.0141C27.2065 39.3191 26.1593 38.952 25.06 39.104C23.9521 39.2572 23.0875 39.9092 22.5492 40.814L22.5473 40.8159C22.011 41.7287 21.8167 42.8743 22.0482 44.0649V44.0679C22.0652 44.1529 22.0474 44.218 22.0258 44.2544C22.0056 44.2883 21.9871 44.2931 21.9779 44.2944C21.9662 44.2961 21.932 44.2962 21.8832 44.2554C21.8461 44.2243 21.8107 44.1762 21.7875 44.1157L21.7689 44.0513C21.2189 41.2905 22.7105 38.9336 24.9086 38.6245Z"
      stroke="#101C3F"
    />
    <path
      d="M42.1987 36.1622C44.4192 35.8549 46.7675 37.702 47.3091 40.4747V40.4776C47.326 40.5629 47.3078 40.6294 47.2856 40.6671C47.2644 40.7031 47.2466 40.7042 47.2466 40.7042C47.2428 40.7047 47.2093 40.7067 47.1567 40.6632C47.1044 40.6197 47.057 40.5481 47.0395 40.461C46.8071 39.269 46.1772 38.2473 45.3384 37.5538C44.4974 36.8586 43.4396 36.4913 42.3501 36.6436C41.2515 36.7972 40.3891 37.4497 39.8423 38.3497L39.8364 38.3595C39.3145 39.2671 39.1062 40.4104 39.3384 41.6046L39.3393 41.6075C39.3563 41.6928 39.3381 41.7593 39.3159 41.797C39.2954 41.8318 39.2768 41.8341 39.2768 41.8341C39.2739 41.8345 39.2394 41.8374 39.186 41.793C39.1469 41.7605 39.1113 41.7121 39.0884 41.6534L39.0698 41.5909C38.5196 38.8295 40.0119 36.473 42.1997 36.1641L42.1987 36.1622Z"
      stroke="#101C3F"
    />
      <path
        css={sparklePrimary}
        d="M67.695 19.3892C67.6338 18.5482 68.0412 17.742 68.7545 17.2923L71.078 15.8275C71.367 15.6452 71.4949 15.2897 71.3883 14.9651C71.2816 14.6405 70.9677 14.4302 70.6269 14.455L67.8874 14.6542C67.0464 14.7154 66.2402 14.308 65.7905 13.5947L64.3257 11.2712C64.1434 10.9822 63.7879 10.8542 63.4633 10.9609C63.1387 11.0676 62.9284 11.3815 62.9532 11.7223L63.1522 14.462C63.2134 15.3029 62.806 16.1091 62.0928 16.5587L59.7694 18.0235C59.4804 18.2057 59.3524 18.5613 59.4591 18.8859C59.5658 19.2104 59.8797 19.4208 60.2205 19.396L62.9598 19.1968C63.8008 19.1357 64.6069 19.543 65.0566 20.2562L66.5217 22.5798C66.7039 22.8688 67.0595 22.9967 67.384 22.8901C67.7086 22.7834 67.919 22.4695 67.8942 22.1287L67.695 19.3892Z"
        fill="#FEC514"
      />
      <path
        css={sparkleSecondary}
        d="M54.0784 14.7032C54.0389 14.1605 54.3017 13.6403 54.762 13.3501L56.2614 12.4049C56.4479 12.2873 56.5304 12.0579 56.4616 11.8484C56.3927 11.639 56.1902 11.5033 55.9703 11.5193L54.2025 11.6478C53.6599 11.6873 53.1396 11.4244 52.8494 10.9641L51.9042 9.46482C51.7866 9.27832 51.5572 9.19577 51.3477 9.26461C51.1383 9.33345 51.0026 9.53599 51.0186 9.75588L51.147 11.5238C51.1865 12.0664 50.9236 12.5866 50.4634 12.8768L48.9641 13.822C48.7776 13.9396 48.6951 14.169 48.7639 14.3784C48.8328 14.5879 49.0353 14.7236 49.2552 14.7076L51.0229 14.5791C51.5655 14.5396 52.0857 14.8025 52.3759 15.2627L53.3213 16.7621C53.4389 16.9486 53.6683 17.0311 53.8777 16.9623C54.0872 16.8934 54.2229 16.6909 54.2069 16.471L54.0784 14.7032Z"
        fill="#FEC514"
      />
      </svg>
    </span>
  );
};
