/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

import type { EventTileLayoutProps } from "./types";

/**
 * IRC layout for EventTile
 * Renders timestamp on the left, followed by sender, avatar, and content
 */
export function EventTileIRCLayout({
    ircTimestamp,
    sender,
    ircPadlock,
    avatar,
    lineId,
    lineClasses,
    onContextMenu,
    contextMenu,
    groupTimestamp,
    groupPadlock,
    replyChain,
    tileContent,
    actionBar,
    hasFooter,
    pinnedMessageBadge,
    reactionsRow,
    threadInfo,
    msgOption,
}: EventTileLayoutProps): JSX.Element {
    return (
        <>
            {ircTimestamp}
            {sender}
            {ircPadlock}
            {avatar}
            <div id={lineId} className={lineClasses} key="mx_EventTile_line" onContextMenu={onContextMenu}>
                {contextMenu}
                {groupTimestamp}
                {groupPadlock}
                {replyChain}
                {tileContent}
                {actionBar}
                {hasFooter && (
                    <div className="mx_EventTile_footer">
                        {pinnedMessageBadge}
                        {reactionsRow}
                    </div>
                )}
                {threadInfo}
            </div>
            {msgOption}
        </>
    );
}
