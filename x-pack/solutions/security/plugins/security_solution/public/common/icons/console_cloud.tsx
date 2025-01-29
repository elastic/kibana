/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SVGProps } from 'react';
import React from 'react';
export const IconConsoleCloud: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 1H24V13.0105H22V3H3V21H10V23H1V1Z"
      fill="#535766"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.58586 9.00008L6.29297 6.70718L7.70718 5.29297L11.4143 9.00008L7.70718 12.7072L6.29297 11.293L8.58586 9.00008Z"
      fill="#00BFB3"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 16H10V14H16V16Z" fill="#00BFB3" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18 20.9988C18 20.9992 18 20.9996 18 21L18.0025 21.9228L17.1099 22.0214C15.361 22.2147 14 23.6991 14 25.5C14 27.433 15.567 29 17.5 29H25.5C27.433 29 29 27.433 29 25.5C29 23.9758 28.0251 22.6767 26.6618 22.1972L25.9576 21.9495L25.9949 21.2039C25.9983 21.1364 26 21.0685 26 21C26 18.7909 24.2091 17 22 17C19.7913 17 18.0007 18.7902 18 20.9988ZM16.0539 20.1923C16.4484 17.2606 18.9602 15 22 15C25.177 15 27.7772 17.4692 27.9864 20.5931C29.7737 21.5005 31 23.356 31 25.5C31 28.5376 28.5376 31 25.5 31H17.5C14.4624 31 12 28.5376 12 25.5C12 22.9626 13.7176 20.8275 16.0539 20.1923Z"
      fill="#535766"
    />
  </svg>
);
