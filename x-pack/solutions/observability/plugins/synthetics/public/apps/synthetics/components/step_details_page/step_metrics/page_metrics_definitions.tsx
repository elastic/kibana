/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiButtonEmpty, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PageMetrics } from '../../../../../../common/runtime_types';

export const PageMetricsDefinitions = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((prevPopoverOpen) => !prevPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const definitionList = performanceMetrics.map(({ label, description, bestPractice }) => ({
    title: label,
    description: `${description} ${bestPractice}`,
  }));

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          data-test-subj="syntheticsDefinitionsPopoverButton"
          iconType="list"
          iconSide="right"
          onClick={onButtonClick}
        >
          {DEFINITIONS_LABEL}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
    >
      <EuiPopoverTitle>{DEFINITIONS_LABEL}</EuiPopoverTitle>
      <div style={{ width: '750px', height: '500px', overflowY: 'scroll' }}>
        <EuiDescriptionList listItems={definitionList} />
      </div>
    </EuiPopover>
  );
};

const DEFINITIONS_LABEL = i18n.translate('xpack.synthetics.stepDetailsRoute.definition', {
  defaultMessage: 'Definitions',
});

// Labels
const SCRIPT_DURATION_LABEL = i18n.translate('xpack.synthetics.scriptDuration.label', {
  defaultMessage: 'JS Execution Time',
});

const FRAMES_LABEL = i18n.translate('xpack.synthetics.frames.label', {
  defaultMessage: 'Frames Rendered',
});

const JS_EVENT_LISTENERS_LABEL = i18n.translate('xpack.synthetics.jsEventListeners.label', {
  defaultMessage: 'JS Event Listeners',
});

const RECALC_STYLE_DURATION_LABEL = i18n.translate('xpack.synthetics.recalcStyleDuration.label', {
  defaultMessage: 'Recalculate Styles Duration',
});

const LAYOUT_COUNT_LABEL = i18n.translate('xpack.synthetics.layoutCount.label', {
  defaultMessage: 'Layout Reflows',
});

const JS_HEAP_TOTAL_SIZE_LABEL = i18n.translate('xpack.synthetics.jsHeapTotalSize.label', {
  defaultMessage: 'Total JS Heap Size',
});

const JS_HEAP_USED_SIZE_LABEL = i18n.translate('xpack.synthetics.jsHeapUsedSize.label', {
  defaultMessage: 'Used JS Heap Size',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.timestamp.perf.label', {
  defaultMessage: 'Timestamp',
});

const NODES_LABEL = i18n.translate('xpack.synthetics.nodes.label', {
  defaultMessage: 'DOM Nodes',
});

const RECALC_STYLE_COUNT_LABEL = i18n.translate('xpack.synthetics.recalcStyleCount.label', {
  defaultMessage: 'Style Recalculations',
});

const LAYOUT_DURATION_LABEL = i18n.translate('xpack.synthetics.layoutDuration.label', {
  defaultMessage: 'Layout Computation Time',
});

const TASK_DURATION_LABEL = i18n.translate('xpack.synthetics.taskDuration.label', {
  defaultMessage: 'Total Task Execution Time',
});

const DOCUMENTS_LABEL = i18n.translate('xpack.synthetics.documents.label', {
  defaultMessage: 'Total Documents',
});

// Descriptions
const SCRIPT_DURATION_DESCRIPTION = i18n.translate('xpack.synthetics.scriptDuration.description', {
  defaultMessage: 'Total time spent executing JavaScript scripts.',
});

const FRAMES_DESCRIPTION = i18n.translate('xpack.synthetics.frames.description', {
  defaultMessage: 'Number of frames rendered during the page lifecycle.',
});

const JS_EVENT_LISTENERS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.jsEventListeners.description',
  {
    defaultMessage: 'Number of event listeners attached to elements on the page.',
  }
);

const RECALC_STYLE_DURATION_DESCRIPTION = i18n.translate(
  'xpack.synthetics.recalcStyleDuration.description',
  {
    defaultMessage: 'Time spent recalculating styles when elements change.',
  }
);

const LAYOUT_COUNT_DESCRIPTION = i18n.translate('xpack.synthetics.layoutCount.description', {
  defaultMessage: 'Number of times the browser had to recalculate layouts.',
});

const JS_HEAP_TOTAL_SIZE_DESCRIPTION = i18n.translate(
  'xpack.synthetics.jsHeapTotalSize.description',
  {
    defaultMessage: 'Total memory allocated for JavaScript objects.',
  }
);

const JS_HEAP_USED_SIZE_DESCRIPTION = i18n.translate(
  'xpack.synthetics.jsHeapUsedSize.description',
  {
    defaultMessage: 'Memory actively used by JavaScript objects.',
  }
);

const TIMESTAMP_DESCRIPTION = i18n.translate('xpack.synthetics.timestamp.description', {
  defaultMessage: 'Time elapsed since the page load started.',
});

const NODES_DESCRIPTION = i18n.translate('xpack.synthetics.nodes.description', {
  defaultMessage: 'Total number of elements in the DOM.',
});

const RECALC_STYLE_COUNT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.recalcStyleCount.description',
  {
    defaultMessage: 'Number of times styles were recalculated.',
  }
);

const LAYOUT_DURATION_DESCRIPTION = i18n.translate('xpack.synthetics.layoutDuration.description', {
  defaultMessage: 'Time spent computing new element positions after changes.',
});

const TASK_DURATION_DESCRIPTION = i18n.translate('xpack.synthetics.taskDuration.description', {
  defaultMessage: 'Total time spent on script execution, rendering, and processing.',
});

const DOCUMENTS_DESCRIPTION = i18n.translate('xpack.synthetics.documents.description', {
  defaultMessage: 'Number of documents loaded in the page, including iframes.',
});

// Best Practices
const SCRIPT_DURATION_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.scriptDuration.bestPractice',
  {
    defaultMessage:
      'Keep JavaScript execution under 50ms per frame to ensure smooth interactions. Optimize long-running scripts by breaking them into smaller tasks.',
  }
);

const FRAMES_BEST_PRACTICE = i18n.translate('xpack.synthetics.frames.bestPractice', {
  defaultMessage:
    'Aim for at least 60 frames per second (FPS) for smooth animations. If FPS drops, optimize CSS animations, JavaScript, and reduce render-blocking resources.',
});

const JS_EVENT_LISTENERS_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.jsEventListeners.bestPractice',
  {
    defaultMessage:
      'Excessive event listeners can slow down the page. Remove unnecessary listeners and use event delegation to reduce the number of handlers.',
  }
);

const RECALC_STYLE_DURATION_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.recalcStyleDuration.bestPractice',
  {
    defaultMessage:
      'Minimize unnecessary style changes and avoid modifying styles frequently inside loops to prevent layout thrashing.',
  }
);

const LAYOUT_COUNT_BEST_PRACTICE = i18n.translate('xpack.synthetics.layoutCount.bestPractice', {
  defaultMessage:
    'Reduce the number of layout recalculations by batching DOM changes and using `transform` instead of modifying layout properties like `width` or `height`.',
});

const JS_HEAP_TOTAL_SIZE_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.jsHeapTotalSize.bestPractice',
  {
    defaultMessage:
      'Monitor and optimize memory usage to prevent memory leaks. Avoid excessive use of global variables and remove unused references.',
  }
);

const JS_HEAP_USED_SIZE_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.jsHeapUsedSize.bestPractice',
  {
    defaultMessage:
      'Optimize memory usage by releasing unused variables, using `WeakMap` for temporary storage, and minimizing large data structures.',
  }
);

const TIMESTAMP_BEST_PRACTICE = i18n.translate('xpack.synthetics.timestamp.bestPractice', {
  defaultMessage:
    'Used mainly for debugging and performance tracking. Ensure critical resources load early in the page lifecycle.',
});

const NODES_BEST_PRACTICE = i18n.translate('xpack.synthetics.nodes.bestPractice', {
  defaultMessage:
    'Keep DOM size under 1,500 elements for optimal performance. Excessive DOM nodes slow down rendering and increase memory usage.',
});

const RECALC_STYLE_COUNT_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.recalcStyleCount.bestPractice',
  {
    defaultMessage:
      'Avoid frequent style changes and batch updates to prevent unnecessary recalculations.',
  }
);

const LAYOUT_DURATION_BEST_PRACTICE = i18n.translate(
  'xpack.synthetics.layoutDuration.bestPractice',
  {
    defaultMessage:
      'Optimize CSS and minimize layout recalculations by using efficient positioning strategies like `absolute` or `fixed` when necessary.',
  }
);

const TASK_DURATION_BEST_PRACTICE = i18n.translate('xpack.synthetics.taskDuration.bestPractice', {
  defaultMessage:
    'Keep tasks under 50ms per frame to ensure a smooth user experience. Use requestAnimationFrame for animations instead of setTimeout or setInterval.',
});

const DOCUMENTS_BEST_PRACTICE = i18n.translate('xpack.synthetics.documents.bestPractice', {
  defaultMessage:
    'Minimize the use of iframes where possible, as each iframe adds extra processing overhead.',
});

export const performanceMetrics: Array<{
  key: keyof PageMetrics;
  unit: string;
  label: string;
  description: string;
  bestPractice: string;
}> = [
  {
    key: 'ScriptDuration',
    unit: 'ms',
    label: SCRIPT_DURATION_LABEL,
    description: SCRIPT_DURATION_DESCRIPTION,
    bestPractice: SCRIPT_DURATION_BEST_PRACTICE,
  },
  {
    key: 'Frames',
    unit: '',
    label: FRAMES_LABEL,
    description: FRAMES_DESCRIPTION,
    bestPractice: FRAMES_BEST_PRACTICE,
  },
  {
    key: 'JSEventListeners',
    unit: '',
    label: JS_EVENT_LISTENERS_LABEL,
    description: JS_EVENT_LISTENERS_DESCRIPTION,
    bestPractice: JS_EVENT_LISTENERS_BEST_PRACTICE,
  },
  {
    key: 'RecalcStyleDuration',
    unit: 'ms',
    label: RECALC_STYLE_DURATION_LABEL,
    description: RECALC_STYLE_DURATION_DESCRIPTION,
    bestPractice: RECALC_STYLE_DURATION_BEST_PRACTICE,
  },
  {
    key: 'LayoutCount',
    unit: '',
    label: LAYOUT_COUNT_LABEL,
    description: LAYOUT_COUNT_DESCRIPTION,
    bestPractice: LAYOUT_COUNT_BEST_PRACTICE,
  },
  {
    key: 'JSHeapTotalSize',
    unit: 'bytes',
    label: JS_HEAP_TOTAL_SIZE_LABEL,
    description: JS_HEAP_TOTAL_SIZE_DESCRIPTION,
    bestPractice: JS_HEAP_TOTAL_SIZE_BEST_PRACTICE,
  },
  {
    key: 'JSHeapUsedSize',
    unit: 'bytes',
    label: JS_HEAP_USED_SIZE_LABEL,
    description: JS_HEAP_USED_SIZE_DESCRIPTION,
    bestPractice: JS_HEAP_USED_SIZE_BEST_PRACTICE,
  },
  {
    key: 'Timestamp',
    unit: 'ms',
    label: TIMESTAMP_LABEL,
    description: TIMESTAMP_DESCRIPTION,
    bestPractice: TIMESTAMP_BEST_PRACTICE,
  },
  {
    key: 'Nodes',
    unit: '',
    label: NODES_LABEL,
    description: NODES_DESCRIPTION,
    bestPractice: NODES_BEST_PRACTICE,
  },
  {
    key: 'RecalcStyleCount',
    unit: '',
    label: RECALC_STYLE_COUNT_LABEL,
    description: RECALC_STYLE_COUNT_DESCRIPTION,
    bestPractice: RECALC_STYLE_COUNT_BEST_PRACTICE,
  },
  {
    key: 'LayoutDuration',
    unit: 'ms',
    label: LAYOUT_DURATION_LABEL,
    description: LAYOUT_DURATION_DESCRIPTION,
    bestPractice: LAYOUT_DURATION_BEST_PRACTICE,
  },
  {
    key: 'TaskDuration',
    unit: 'ms',
    label: TASK_DURATION_LABEL,
    description: TASK_DURATION_DESCRIPTION,
    bestPractice: TASK_DURATION_BEST_PRACTICE,
  },
  {
    key: 'Documents',
    unit: '',
    label: DOCUMENTS_LABEL,
    description: DOCUMENTS_DESCRIPTION,
    bestPractice: DOCUMENTS_BEST_PRACTICE,
  },
];
