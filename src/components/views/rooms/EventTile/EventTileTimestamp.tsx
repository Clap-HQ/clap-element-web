/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type MouseEvent } from "react";

import type { MatrixEvent, Thread } from "matrix-js-sdk/src/matrix";
import MessageTimestamp from "../../messages/MessageTimestamp";
import { TimelineRenderingType } from "../../../../contexts/RoomContext";
import { getLateEventInfo } from "../../../structures/grouper/LateEventGrouper";

export interface EventTileTimestampProps {
    mxEvent: MatrixEvent;
    thread?: Thread | null;
    timelineRenderingType: TimelineRenderingType;
    isTwelveHour?: boolean;
    permalink?: string;
    onPermalinkClick?: (e: MouseEvent) => void;
    onTimestampContextMenu?: (e: MouseEvent) => void;
}

/**
 * Timestamp component for EventTile
 * Renders message timestamp with optional permalink support
 */
export function EventTileTimestamp({
    mxEvent,
    thread,
    timelineRenderingType,
    isTwelveHour,
    permalink,
    onPermalinkClick,
    onTimestampContextMenu,
}: EventTileTimestampProps): JSX.Element {
    // Thread panel shows the timestamp of the last reply in that thread
    let ts =
        timelineRenderingType !== TimelineRenderingType.ThreadsList ? mxEvent.getTs() : thread?.replyToEvent?.getTs();

    if (typeof ts !== "number") {
        // Fall back to something we can use
        ts = mxEvent.getTs();
    }

    const messageTimestampProps = {
        showRelative: timelineRenderingType === TimelineRenderingType.ThreadsList,
        showTwelveHour: isTwelveHour,
        ts,
        receivedTs: getLateEventInfo(mxEvent)?.received_ts,
    };

    // If permalink is provided, render linked timestamp
    if (permalink && onPermalinkClick) {
        return (
            <MessageTimestamp
                {...messageTimestampProps}
                href={permalink}
                onClick={onPermalinkClick}
                onContextMenu={onTimestampContextMenu}
            />
        );
    }

    // Otherwise render plain timestamp
    return <MessageTimestamp {...messageTimestampProps} />;
}
