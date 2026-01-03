/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { EventType, type MatrixEvent, type RoomMember } from "matrix-js-sdk/src/matrix";

import MemberAvatar from "../../avatars/MemberAvatar";
import { TimelineRenderingType } from "../../../../contexts/RoomContext";

export interface EventTileAvatarProps {
    mxEvent: MatrixEvent;
    avatarSize: string;
    inhibitInteraction?: boolean;
    timelineRenderingType: TimelineRenderingType;
}

/**
 * Avatar component for EventTile
 * Renders user avatar with appropriate size and interaction handling
 */
export function EventTileAvatar({
    mxEvent,
    avatarSize,
    inhibitInteraction,
    timelineRenderingType,
}: EventTileAvatarProps): JSX.Element {
    let member: RoomMember | null = null;

    // Set member to receiver (target) if it is a 3PID invite
    // so that the correct avatar is shown as the text is
    // `$target accepted the invitation for $email`
    if (mxEvent.getContent().third_party_invite) {
        member = mxEvent.target;
    } else {
        member = mxEvent.sender;
    }

    // In the ThreadsList view we use the entire EventTile as a click target to open the thread instead
    const viewUserOnClick =
        !inhibitInteraction &&
        ![TimelineRenderingType.ThreadsList, TimelineRenderingType.Notification].includes(timelineRenderingType);

    return (
        <div className="mx_EventTile_avatar">
            <MemberAvatar
                member={member}
                size={avatarSize}
                viewUserOnClick={viewUserOnClick}
                forceHistorical={mxEvent.getType() === EventType.RoomMember}
            />
        </div>
    );
}
