/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

import type { MatrixEvent } from "matrix-js-sdk/src/matrix";
import SenderProfile from "../../messages/SenderProfile";
import { TimelineRenderingType } from "../../../../contexts/RoomContext";

export interface EventTileSenderProps {
    mxEvent: MatrixEvent;
    timelineRenderingType: TimelineRenderingType;
    onClick?: () => void;
}

/**
 * Sender profile component for EventTile
 * Renders sender name/avatar with appropriate interaction based on timeline type
 */
export function EventTileSender({ mxEvent, timelineRenderingType, onClick }: EventTileSenderProps): JSX.Element {
    // Determine props based on timeline rendering type
    if (
        timelineRenderingType === TimelineRenderingType.Room ||
        timelineRenderingType === TimelineRenderingType.Search ||
        timelineRenderingType === TimelineRenderingType.Pinned ||
        timelineRenderingType === TimelineRenderingType.Thread
    ) {
        return <SenderProfile onClick={onClick} mxEvent={mxEvent} />;
    } else if (timelineRenderingType === TimelineRenderingType.ThreadsList) {
        return <SenderProfile mxEvent={mxEvent} withTooltip />;
    } else {
        return <SenderProfile mxEvent={mxEvent} />;
    }
}
