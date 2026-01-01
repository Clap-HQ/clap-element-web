/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventType, MsgType } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import { TimelineRenderingType } from "../../../../../contexts/RoomContext";
import { ElementCallEventType } from "../../../../../call-types";

export interface GetEventClassesParams {
    isBubbleMessage: boolean;
    isLeftAlignedBubbleMessage: boolean;
    isInfoMessage: boolean;
    noBubbleEvent: boolean;
    isEditing: boolean;
    isTwelveHour?: boolean;
    isSending: boolean;
    shouldHighlight: boolean;
    isSelectedEvent?: boolean;
    hasContextMenu: boolean;
    isContinuation?: boolean;
    eventType: EventType | string;
    last?: boolean;
    lastInSection?: boolean;
    contextual?: boolean;
    actionBarFocused: boolean;
    isEncryptionFailure: boolean;
    msgtype: MsgType | string | undefined;
    hideSender?: boolean;
    timelineRenderingType: TimelineRenderingType;
    isRenderingNotification: boolean;
}

/**
 * Calculate CSS classes for the main event tile element
 *
 * @param params - Parameters from event, props, and state
 * @returns CSS class string for the event tile
 */
export function getEventClasses(params: GetEventClassesParams): string {
    const {
        isBubbleMessage,
        isLeftAlignedBubbleMessage,
        isInfoMessage,
        noBubbleEvent,
        isEditing,
        isTwelveHour,
        isSending,
        shouldHighlight,
        isSelectedEvent,
        hasContextMenu,
        isContinuation,
        eventType,
        last,
        lastInSection,
        contextual,
        actionBarFocused,
        isEncryptionFailure,
        msgtype,
        hideSender,
        timelineRenderingType,
        isRenderingNotification,
    } = params;

    return classNames({
        mx_EventTile_bubbleContainer: isBubbleMessage,
        mx_EventTile_leftAlignedBubble: isLeftAlignedBubbleMessage,
        mx_EventTile: true,
        mx_EventTile_isEditing: isEditing,
        mx_EventTile_info: isInfoMessage,
        mx_EventTile_12hr: isTwelveHour,
        // Note: we keep the `sending` state class for tests, not for our styles
        mx_EventTile_sending: !isEditing && isSending,
        mx_EventTile_highlight: shouldHighlight,
        mx_EventTile_selected: isSelectedEvent || hasContextMenu,
        mx_EventTile_continuation:
            isContinuation || eventType === EventType.CallInvite || ElementCallEventType.matches(eventType),
        mx_EventTile_last: last,
        mx_EventTile_lastInSection: lastInSection,
        mx_EventTile_contextual: contextual,
        mx_EventTile_actionBarFocused: actionBarFocused,
        mx_EventTile_bad: isEncryptionFailure,
        mx_EventTile_emote: msgtype === MsgType.Emote,
        mx_EventTile_noSender: hideSender,
        mx_EventTile_clamp: timelineRenderingType === TimelineRenderingType.ThreadsList || isRenderingNotification,
        mx_EventTile_noBubble: noBubbleEvent,
    });
}
