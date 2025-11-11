import { React } from "@vendetta/metro/common";
import { ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms, General } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { findByProps } from "@vendetta/utils";
import { settings, sendFakeMessage } from ".";

const { FormRow, FormSection, FormInput } = Forms;
const { View, Text, TouchableOpacity, StyleSheet } = ReactNative;

export default function Settings() {
    useProxy(storage);

    const [targetUserId, setTargetUserId] = React.useState(settings.targetUserId || "");
    const [fromUserId, setFromUserId] = React.useState(settings.fromUserId || "");
    const [messageContent, setMessageContent] = React.useState(settings.messageContent || "");
    const [embedTitle, setEmbedTitle] = React.useState(settings.embedTitle || "");
    const [embedDescription, setEmbedDescription] = React.useState(settings.embedDescription || "");
    const [embedImageUrl, setEmbedImageUrl] = React.useState(settings.embedImageUrl || "");

    const handleSendFakeMessage = async () => {
        await sendFakeMessage(
            targetUserId,
            fromUserId,
            messageContent,
            embedTitle || undefined,
            embedDescription || undefined,
            embedImageUrl || undefined
        );
        
        // Clear message content and embeds after sending
        setMessageContent("");
        setEmbedTitle("");
        setEmbedDescription("");
        setEmbedImageUrl("");
        
        // Save user IDs to settings
        settings.targetUserId = targetUserId;
        settings.fromUserId = fromUserId;
    };

    const quickTestMessage = () => {
        setTargetUserId("747648046061453492");
        setFromUserId("747648046061453492");
        setMessageContent("test");
        setEmbedTitle("Optional embed title");
        setEmbedDescription("Optional embed description");
        setEmbedImageUrl("Optional image URL");
    };

    const pasteFromClipboard = async (setter: (value: string) => void) => {
        try {
            const Clipboard = findByProps("getString") || (global as any).require?.("@react-native-clipboard/clipboard")?.default;
            if (Clipboard && Clipboard.getString) {
                const text = await Clipboard.getString();
                setter(text.trim());
            } else {
                showToast("Clipboard not available", getAssetIDByName("Small"));
            }
        } catch (e) {
            showToast("Failed to read clipboard", getAssetIDByName("Small"));
        }
    };

    return (
        <General.ScrollView style={{ flex: 1 }}>
            <Forms.FormSection title="MESSAGE FAKER">
                <Forms.FormRow
                    label="Inject fake messages into DMs from anyone."
                    leading={<Forms.FormIcon source={getAssetIDByName("ic_message")} />}
                />
            </Forms.FormSection>

            <Forms.FormSection title="CREATE FAKE MESSAGE">
                <Forms.FormRow
                    label="Create a fake message in someone's DM"
                    leading={<Forms.FormIcon source={getAssetIDByName("ic_edit")} />}
                />
            </Forms.FormSection>

            <Forms.FormSection title="TARGET USER ID (Whose DM)">
                <Forms.FormRow
                    label="User ID of person whose DM you want to inject into"
                />
                <Forms.FormInput
                    title=""
                    placeholder="Enter target user ID"
                    value={targetUserId}
                    onChange={(x: string) => {
                        setTargetUserId(x);
                        settings.targetUserId = x;
                    }}
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
                <TouchableOpacity
                    style={styles.pasteButton}
                    onPress={() => pasteFromClipboard(setTargetUserId)}
                >
                    <Forms.FormIcon source={getAssetIDByName("ic_copy")} />
                    <Text style={styles.buttonText}>Paste Target User ID</Text>
                </TouchableOpacity>
            </Forms.FormSection>

            <Forms.FormSection title="FROM USER ID (Who message is from)">
                <Forms.FormRow
                    label="User ID of who the message appears to be from"
                />
                <Forms.FormInput
                    title=""
                    placeholder="Enter sender user ID"
                    value={fromUserId}
                    onChange={(x: string) => {
                        setFromUserId(x);
                        settings.fromUserId = x;
                    }}
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
                <TouchableOpacity
                    style={styles.pasteButton}
                    onPress={() => pasteFromClipboard(setFromUserId)}
                >
                    <Forms.FormIcon source={getAssetIDByName("ic_copy")} />
                    <Text style={styles.buttonText}>Paste Sender User ID</Text>
                </TouchableOpacity>
            </Forms.FormSection>

            <Forms.FormSection title="MESSAGE CONTENT">
                <Forms.FormRow
                    label="The message text"
                />
                <Forms.FormInput
                    title=""
                    placeholder="Enter message text"
                    value={messageContent}
                    onChange={(x: string) => {
                        setMessageContent(x);
                        settings.messageContent = x;
                    }}
                    multiline
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
            </Forms.FormSection>

            <Forms.FormSection title="EMBED OPTIONS">
                <Forms.FormRow
                    label="Optional: Add an embed"
                    leading={<Forms.FormIcon source={getAssetIDByName("ic_attachment")} />}
                />
                <Forms.FormInput
                    title=""
                    placeholder="Optional embed title"
                    value={embedTitle}
                    onChange={(x: string) => {
                        setEmbedTitle(x);
                        settings.embedTitle = x;
                    }}
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
                <Forms.FormInput
                    title=""
                    placeholder="Optional embed description"
                    value={embedDescription}
                    onChange={(x: string) => {
                        setEmbedDescription(x);
                        settings.embedDescription = x;
                    }}
                    multiline
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
                <Forms.FormInput
                    title=""
                    placeholder="Optional image URL"
                    value={embedImageUrl}
                    onChange={(x: string) => {
                        setEmbedImageUrl(x);
                        settings.embedImageUrl = x;
                    }}
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
            </Forms.FormSection>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={handleSendFakeMessage}
                >
                    <Forms.FormIcon source={getAssetIDByName("ic_message")} />
                    <Text style={styles.actionButtonText}>Send Fake Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.testButton]}
                    onPress={quickTestMessage}
                >
                    <Forms.FormIcon source={getAssetIDByName("ic_edit")} />
                    <Text style={styles.actionButtonText}>Quick Test Message</Text>
                </TouchableOpacity>
            </View>

            <Forms.FormSection title="CONSOLE API">
                <Forms.FormRow
                    label="You can also use the console for advanced usage."
                />
            </Forms.FormSection>
        </General.ScrollView>
    );
}

const styles = StyleSheet.create({
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

