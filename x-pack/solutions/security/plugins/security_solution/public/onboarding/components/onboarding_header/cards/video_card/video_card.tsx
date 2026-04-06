/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { OnboardingHeaderCardId } from '../../constants';
import { OnboardingHeaderVideoModal } from './video_modal';
import * as i18n from './translations';
import { WebinarVideoIllustration } from './webinar_video_illustration';
import { LinkCard } from '../common/link_card';

export const VideoCard = React.memo<{ isDarkMode: boolean }>(({ isDarkMode }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeVideoModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);
  const showVideoModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  return (
    <>
      <LinkCard
        id={OnboardingHeaderCardId.video}
        onClick={showVideoModal}
        icon={<WebinarVideoIllustration size={64} alt={i18n.ONBOARDING_HEADER_VIDEO_TITLE} />}
        title={i18n.ONBOARDING_HEADER_VIDEO_TITLE}
        description={i18n.ONBOARDING_HEADER_VIDEO_DESCRIPTION}
        linkText={i18n.ONBOARDING_HEADER_VIDEO_LINK_TITLE}
      />
      {isModalVisible && <OnboardingHeaderVideoModal onClose={closeVideoModal} />}
    </>
  );
});
VideoCard.displayName = 'VideoCard';
