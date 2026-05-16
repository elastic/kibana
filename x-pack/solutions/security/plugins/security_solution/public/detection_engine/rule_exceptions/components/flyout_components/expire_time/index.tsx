/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDatePicker, EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Moment } from 'moment';
import moment from 'moment';
import React, { useCallback, useState } from 'react';
import * as i18n from './translations';

interface ExceptionItmeExpireTimeProps {
  expireTime: Moment | undefined;
  setExpireTime: (date: Moment | undefined) => void;
  setExpireError: (errorExists: boolean) => void;
}

const ExceptionItemExpireTime: React.FC<ExceptionItmeExpireTimeProps> = ({
  expireTime,
  setExpireTime,
  setExpireError,
}): JSX.Element => {
  const [dateTime, setDateTime] = useState<Moment | undefined>(expireTime);
  const [isInvalid, setIsInvalid] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = useCallback(
    (date: Moment | null) => {
      setDateTime(date ?? undefined);
      setExpireTime(date ?? undefined);
      if (date?.isBefore()) {
        setIsInvalid(true);
        setErrors([i18n.EXCEPTION_EXPIRE_TIME_ERROR]);
        setExpireError(true);
      } else {
        setIsInvalid(false);
        setErrors([]);
        setExpireError(false);
      }
    },
    [setDateTime, setExpireTime, setExpireError]
  );

  return (
    <div>
      <EuiTitle size="xs" css={{ fontWeight: 600 }}>
        <h3>{i18n.EXCEPTION_EXPIRE_TIME_HEADER}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        error={errors}
        isInvalid={isInvalid}
        label={i18n.EXPIRE_TIME_LABEL}
        id="exceptionExpireTime"
      >
        <EuiDatePicker
          customInput={<EuiFieldText controlOnly aria-labelledby="exceptionExpireTime-label" />}
          customInputRef="inputRef"
          showTimeSelect
          selected={dateTime}
          isInvalid={isInvalid}
          onChange={handleChange}
          onClear={() => handleChange(null)}
          minDate={moment()}
        />
      </EuiFormRow>
    </div>
  );
};

export const ExceptionsExpireTime = React.memo(ExceptionItemExpireTime);

ExceptionsExpireTime.displayName = 'ExceptionsExpireTime';
