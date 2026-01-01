/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import { MediaEventHelper } from "../../../../../utils/MediaEventHelper";

/**
 * Calculate CSS classes for the event tile line element
 *
 * @param mxEvent - The Matrix event
 * @returns CSS class string for the line element
 */
export function getLineClasses(mxEvent: MatrixEvent): string {
    const isProbablyMedia = MediaEventHelper.isEligible(mxEvent);

    return classNames("mx_EventTile_line", {
        mx_EventTile_mediaLine: isProbablyMedia,
        mx_EventTile_image: mxEvent.getType() === EventType.RoomMessage && mxEvent.getContent().msgtype === MsgType.Image,
        mx_EventTile_sticker: mxEvent.getType() === EventType.Sticker,
        mx_EventTile_emote: mxEvent.getType() === EventType.RoomMessage && mxEvent.getContent().msgtype === MsgType.Emote,
    });
}
