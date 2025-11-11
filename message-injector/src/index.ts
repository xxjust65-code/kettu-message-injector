import { ReactNative } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/utils";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// Store for fake messages - keyed by channel ID
const fakeMessages = new Map<string, any[]>();

// Patches array to store them for cleanup
let patches: any[] = [];

// Export settings from storage
export const settings: {
    targetUserId?: string;
    fromUserId?: string;
    messageContent?: string;
    embedTitle?: string;
    embedDescription?: string;
    embedImageUrl?: string;
} = storage;

// Function to send fake message (exported for use in Settings)
export const sendFakeMessage = async (
    targetUserId: string,
    fromUserId: string,
    messageContent: string,
    embedTitle?: string,
    embedDescription?: string,
    embedImageUrl?: string
) => {
    if (!targetUserId || !fromUserId || !messageContent) {
        showToast("Please fill in all required fields", getAssetIDByName("Small"));
        return;
    }

    try {
        // Get stores
        const UserStore = findByProps("getUser", "getCurrentUser");
        const ChannelStore = findByProps("getDMFromUserId", "getChannel");
        
        // Get user data for the sender
        const senderUser = UserStore.getUser(fromUserId);
        
        if (!senderUser) {
            // Try to fetch user if not in cache
            try {
                const RestAPI = findByProps("get", "getAPIBaseURL");
                if (RestAPI && RestAPI.get) {
                    const userData = await RestAPI.get({
                        url: `/users/${fromUserId}`,
                    });
                    if (userData && userData.body) {
                        // User will be cached by Discord's store
                    }
                } else {
                    showToast("User not found in cache. Please ensure you share a server with this user.", getAssetIDByName("Small"));
                    return;
                }
            } catch (e) {
                showToast("User not found. Make sure the user ID is correct.", getAssetIDByName("Small"));
                return;
            }
        }

        // Get DM channel ID from target user ID
        let channelId: string;
        try {
            const dmChannel = ChannelStore.getDMFromUserId(targetUserId);
            if (dmChannel) {
                channelId = dmChannel.id;
            } else {
                // If DM doesn't exist, we'll use the user ID as fallback
                channelId = targetUserId;
            }
        } catch (e) {
            channelId = targetUserId;
        }

        // Get current timestamp
        const now = new Date();
        const timestamp = now.toISOString();

        // Get sender user again (might be cached now)
        const finalSenderUser = UserStore.getUser(fromUserId);

        // Create fake message object matching Discord's message structure
        const fakeMessage = {
            id: `fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            channel_id: channelId,
            author: {
                id: fromUserId,
                username: finalSenderUser?.username || "Unknown User",
                discriminator: finalSenderUser?.discriminator || "0000",
                avatar: finalSenderUser?.avatar || null,
                bot: finalSenderUser?.bot || false,
                publicFlags: finalSenderUser?.publicFlags || 0,
                globalName: finalSenderUser?.globalName || null,
            },
            content: messageContent,
            timestamp: timestamp,
            edited_timestamp: null,
            tts: false,
            mention_everyone: false,
            mentions: [],
            mention_roles: [],
            attachments: [],
            embeds: embedTitle || embedDescription || embedImageUrl ? [{
                title: embedTitle || undefined,
                description: embedDescription || undefined,
                image: embedImageUrl ? { url: embedImageUrl } : undefined,
                color: 0x5865F2,
                type: "rich",
            }].filter(e => e.title || e.description || e.image) : [],
            pinned: false,
            type: 0,
            flags: 0,
            fake: true, // Internal marker
        };

        // Store fake message by channel ID
        if (!fakeMessages.has(channelId)) {
            fakeMessages.set(channelId, []);
        }
        fakeMessages.get(channelId)!.push(fakeMessage);

        showToast("Fake message sent!", getAssetIDByName("Check"));
    } catch (error) {
        console.error("Error sending fake message:", error);
        showToast("Error sending fake message", getAssetIDByName("Small"));
    }
};

export default {
    onLoad: () => {
        // Patch MessageStore to inject fake messages
        const MessageStore = findByProps("getMessages", "getMessage");
        
        if (MessageStore && MessageStore.getMessages) {
            patches.push(
                after("getMessages", MessageStore, (args, ret) => {
                    if (!ret || !Array.isArray(ret)) return ret;
                    
                    const channelId = args[0];
                    const fakes = fakeMessages.get(channelId);
                    
                    if (!fakes || fakes.length === 0) return ret;
                    
                    // Merge fake messages with real messages
                    const allMessages = [...ret, ...fakes];
                    
                    // Sort by timestamp
                    return allMessages.sort((a: any, b: any) => {
                        const timeA = new Date(a.timestamp).getTime();
                        const timeB = new Date(b.timestamp).getTime();
                        return timeA - timeB;
                    });
                })
            );
        }

        // Also patch getMessage to return fake messages
        if (MessageStore && MessageStore.getMessage) {
            patches.push(
                after("getMessage", MessageStore, (args, ret) => {
                    if (ret) return ret; // If real message exists, return it
                    
                    const channelId = args[0];
                    const messageId = args[1];
                    
                    const fakes = fakeMessages.get(channelId);
                    if (!fakes) return ret;
                    
                    return fakes.find((m: any) => m.id === messageId) || ret;
                })
            );
        }
    },
    
    onUnload: () => {
        // Unpatch everything
        patches.forEach(p => p());
        patches = [];
        
        // Clean up fake messages
        fakeMessages.clear();
    },
    
    settings: Settings
};

