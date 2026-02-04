/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventType } from "matrix-js-sdk/src/matrix";

import { TimelineRenderingType } from "../../../../../contexts/RoomContext";
import { Layout } from "../../../../../settings/enums/Layout";
import { ElementCallEventType } from "../../../../../call-types";

export interface AvatarSizeResult {
    avatarSize: string | null;
    needsSenderProfile: boolean;
}

export interface GetAvatarSizeParams {
    isRenderingNotification: boolean;
    isInfoMessage: boolean;
    isBubbleMessage: boolean;
    eventType: EventType | string;
    timelineRenderingType: TimelineRenderingType;
    continuation?: boolean;
    layout?: Layout;
}

/**
 * Calculate avatar size and whether sender profile should be shown
 * based on event and rendering context.
 *
 * @param params - Parameters from event and context
 * @returns Avatar size and sender profile visibility
 */
export function getAvatarSize(params: GetAvatarSizeParams): AvatarSizeResult {
    const {
        isRenderingNotification,
        isInfoMessage,
        isBubbleMessage,
        eventType,
        timelineRenderingType,
        continuation,
        layout,
    } = params;

    let avatarSize: string | null;
    let needsSenderProfile: boolean;

    if (isRenderingNotification) {
        avatarSize = "24px";
        needsSenderProfile = true;
    } else if (isInfoMessage) {
        // a small avatar, with no sender profile, for
        // joins/parts/etc
        avatarSize = "14px";
        needsSenderProfile = false;
    } else if (
        timelineRenderingType === TimelineRenderingType.ThreadsList ||
        (timelineRenderingType === TimelineRenderingType.Thread && !continuation)
    ) {
        avatarSize = "30px";
        needsSenderProfile = true;
    } else if (eventType === EventType.RoomCreate || isBubbleMessage) {
        avatarSize = null;
        needsSenderProfile = false;
    } else if (layout === Layout.IRC) {
        avatarSize = "14px";
        needsSenderProfile = true;
    } else if (
        (continuation && timelineRenderingType !== TimelineRenderingType.File) ||
        eventType === EventType.CallInvite ||
        ElementCallEventType.matches(eventType)
    ) {
        // no avatar or sender profile for continuation messages and call tiles
        avatarSize = null;
        needsSenderProfile = false;
    } else if (timelineRenderingType === TimelineRenderingType.File) {
        avatarSize = "20px";
        needsSenderProfile = true;
    } else {
        avatarSize = "30px";
        needsSenderProfile = true;
    }

    return { avatarSize, needsSenderProfile };
}
