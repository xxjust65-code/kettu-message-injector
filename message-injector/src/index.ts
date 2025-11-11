import { definePlugin } from "@vendetta";
import { React, ReactNative } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { find, findByProps } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms, General } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";

const { FormRow, FormSection, FormInput, FormSwitch, FormDivider } = Forms;
const { View, Text, ScrollView, TouchableOpacity, StyleSheet } = ReactNative;

// Store for fake messages - keyed by channel ID
const fakeMessages = new Map<string, any[]>();

// Patches array to store them for cleanup
let patches: any[] = [];

// Settings component
function Settings() {
  const [targetUserId, setTargetUserId] = React.useState("");
  const [fromUserId, setFromUserId] = React.useState("");
  const [messageContent, setMessageContent] = React.useState("");
  const [embedTitle, setEmbedTitle] = React.useState("");
  const [embedDescription, setEmbedDescription] = React.useState("");
  const [embedImageUrl, setEmbedImageUrl] = React.useState("");

  const sendFakeMessage = async () => {
    if (!targetUserId || !fromUserId || !messageContent) {
      showToast("Please fill in all required fields", getAssetIDByName("Small"));
      return;
    }

    try {
      // Get stores
      const UserStore = findByProps("getUser", "getCurrentUser");
      const ChannelStore = findByProps("getDMFromUserId", "getChannel");
      const MessageStore = findByProps("getMessages", "getMessage");
      
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
          // The message injection will need to handle this
          channelId = targetUserId;
        }
      } catch (e) {
        channelId = targetUserId;
      }

      // Get current timestamp
      const now = new Date();
      const timestamp = now.toISOString();

      // Create fake message object matching Discord's message structure
      const fakeMessage = {
        id: `fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel_id: channelId,
        author: {
          id: fromUserId,
          username: senderUser?.username || "Unknown User",
          discriminator: senderUser?.discriminator || "0000",
          avatar: senderUser?.avatar || null,
          bot: senderUser?.bot || false,
          publicFlags: senderUser?.publicFlags || 0,
          globalName: senderUser?.globalName || null,
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
      
      // Clear inputs (keep user IDs for convenience)
      setMessageContent("");
      setEmbedTitle("");
      setEmbedDescription("");
      setEmbedImageUrl("");
    } catch (error) {
      console.error("Error sending fake message:", error);
      showToast("Error sending fake message", getAssetIDByName("Small"));
    }
  };

  const quickTestMessage = () => {
    // Set test values
    setTargetUserId("747648046061453492");
    setFromUserId("747648046061453492");
    setMessageContent("test");
    setEmbedTitle("Optional embed title");
    setEmbedDescription("Optional embed description");
    setEmbedImageUrl("Optional image URL");
  };

  return (
    <ScrollView style={styles.container}>
      <FormSection title="MESSAGE FAKER">
        <FormRow
          label="Inject fake messages into DMs from anyone."
          leading={<FormRow.Icon source={getAssetIDByName("ic_message")} />}
        />
      </FormSection>

      <FormSection title="CREATE FAKE MESSAGE">
        <FormRow
          label="Create a fake message in someone's DM"
          leading={<FormRow.Icon source={getAssetIDByName("ic_edit")} />}
        />
      </FormSection>

      <FormSection title="TARGET USER ID (Whose DM)">
        <FormRow
          label="User ID of person whose DM you want to inject into"
        />
        <FormInput
          title="Target User ID"
          value={targetUserId}
          onChangeText={setTargetUserId}
          placeholder="Enter target user ID"
        />
        <TouchableOpacity
          style={styles.pasteButton}
          onPress={async () => {
            // Get clipboard content
            try {
              const Clipboard = findByProps("getString") || (global as any).require?.("@react-native-clipboard/clipboard")?.default;
              if (Clipboard && Clipboard.getString) {
                const text = await Clipboard.getString();
                setTargetUserId(text.trim());
              } else {
                showToast("Clipboard not available", getAssetIDByName("Small"));
              }
            } catch (e) {
              showToast("Failed to read clipboard", getAssetIDByName("Small"));
            }
          }}
        >
          <FormRow.Icon source={getAssetIDByName("ic_copy")} />
          <Text style={styles.buttonText}>Paste Target User ID</Text>
        </TouchableOpacity>
      </FormSection>

      <FormSection title="FROM USER ID (Who message is from)">
        <FormRow
          label="User ID of who the message appears to be from"
        />
        <FormInput
          title="From User ID"
          value={fromUserId}
          onChangeText={setFromUserId}
          placeholder="Enter sender user ID"
        />
        <TouchableOpacity
          style={styles.pasteButton}
          onPress={async () => {
            try {
              const Clipboard = findByProps("getString") || (global as any).require?.("@react-native-clipboard/clipboard")?.default;
              if (Clipboard && Clipboard.getString) {
                const text = await Clipboard.getString();
                setFromUserId(text.trim());
              } else {
                showToast("Clipboard not available", getAssetIDByName("Small"));
              }
            } catch (e) {
              showToast("Failed to read clipboard", getAssetIDByName("Small"));
            }
          }}
        >
          <FormRow.Icon source={getAssetIDByName("ic_copy")} />
          <Text style={styles.buttonText}>Paste Sender User ID</Text>
        </TouchableOpacity>
      </FormSection>

      <FormSection title="MESSAGE CONTENT">
        <FormRow
          label="The message text"
        />
        <FormInput
          title="Message Content"
          value={messageContent}
          onChangeText={setMessageContent}
          placeholder="Enter message text"
          multiline
        />
      </FormSection>

      <FormSection title="EMBED OPTIONS">
        <FormRow
          label="Optional: Add an embed"
          leading={<FormRow.Icon source={getAssetIDByName("ic_attachment")} />}
        />
        <FormInput
          title="Embed Title"
          value={embedTitle}
          onChangeText={setEmbedTitle}
          placeholder="Optional embed title"
        />
        <FormInput
          title="Embed Description"
          value={embedDescription}
          onChangeText={setEmbedDescription}
          placeholder="Optional embed description"
          multiline
        />
        <FormInput
          title="Embed Image URL"
          value={embedImageUrl}
          onChangeText={setEmbedImageUrl}
          placeholder="Optional image URL"
        />
      </FormSection>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.sendButton]}
          onPress={sendFakeMessage}
        >
          <FormRow.Icon source={getAssetIDByName("ic_message")} />
          <Text style={styles.actionButtonText}>Send Fake Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.testButton]}
          onPress={quickTestMessage}
        >
          <FormRow.Icon source={getAssetIDByName("ic_edit")} />
          <Text style={styles.actionButtonText}>Quick Test Message</Text>
        </TouchableOpacity>
      </View>

      <FormSection title="CONSOLE API">
        <FormRow
          label="You can also use the console for advanced usage."
        />
      </FormSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e1e",
  },
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5865F2",
    padding: 12,
    borderRadius: 8,
    margin: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  sendButton: {
    backgroundColor: "#23A55A",
  },
  testButton: {
    backgroundColor: "#F26522",
  },
  actionButtonText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default definePlugin({
  name: "Message Injector",
  description: "Inject fake messages into DMs from anyone (client-sided)",
  authors: [{ name: "Your Name", id: "YOUR_USER_ID" }],
  version: "1.0.0",
  
  settings: Settings,
  
  onLoad() {
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
  
  onUnload() {
    // Unpatch everything
    patches.forEach(p => p());
    patches = [];
    
    // Clean up fake messages
    fakeMessages.clear();
  },
});

